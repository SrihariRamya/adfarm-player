import React, { Component } from "react";

export default class DisplayStrip extends Component {
  constructor(props) {
    super(props);
    this.state = {
      height: window.innerHeight,
      width: window.innerWidth,
    };
  }

  render() {
    const { imageList, left, mode, baseStripPosition, isPlayerInfoId, isBrowser } = this.props;
    const { height, width } = this.state;
    const displayStripUrl = isPlayerInfoId && (isBrowser ? imageList[baseStripPosition].media_url : `http://localhost:8080/${
      imageList[baseStripPosition].player_info_id}.${imageList[baseStripPosition].media_url.split(".").pop()}`);
    let mediaWidth = (mode && !isBrowser) ? height : width;
    let mediaHeight = (mode && !isBrowser) ? width * 0.12 : height * (120 / 720);
    if (imageList.length === 0) {
      mediaWidth = 0;
      mediaHeight = 0;
    }
    if (left) {
      mediaWidth = width * 0.5;
      mediaHeight = height * (600 / 720);
    }
    if (isBrowser && mode) {
      mediaWidth = mediaWidth / 2.5;
    }
    return (
      isPlayerInfoId && <img
        onError={(err) => this.props.onError(imageList[baseStripPosition], err)}
        src={displayStripUrl}
        style={{
          objectFit: "fill",
          height: mediaHeight + "px",
          width: mediaWidth + "px",
        }}
      />
    );
  }
}
