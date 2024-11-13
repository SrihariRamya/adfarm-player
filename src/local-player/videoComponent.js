import React, { PureComponent } from "react";
import blackposter from "./blackscreen.jpeg";
import loaderposter from "./loader.jpg";
class VideoComponent extends PureComponent {

  render() {
    const {
      posterPercentage,
      myref,
      videoLeft,
      url,
      loop,
      onError,
      onEnded,
      mediaType,
      isBrowser,
      videoObjectFit,
      commonVideoWidth,
      commonVideoHeight
    } = this.props;
    let poster = mediaType ?
      (posterPercentage == 100
        ? `${url.substring(0, url.lastIndexOf("."))}poster.jpeg`
        : blackposter) : loaderposter;
    if (isBrowser) {
      poster = null
    }
    return (
      <video
        loop={loop}
        ref={myref}
        src={url}
        poster={poster}
        style={{
          objectFit: videoObjectFit,
          left: videoLeft,
          width: commonVideoWidth + "px",
          height: commonVideoHeight + "px",
        }}
        controls={true}
        autoPlay
        onError={onError}
        onEnded={onEnded}
      ></video>
    );
  }
}

export default VideoComponent;
