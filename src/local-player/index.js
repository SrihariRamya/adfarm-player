import React, { Component } from "react";
import axios from "axios";
import {
  updatePlayCount,
  updateMediaDownloadPercentage,
  tvLogger,
  getPlayerOrientation
} from "./../url-helper";
import _ from "lodash";
import Iframe from "react-iframe";
import moment from "moment-timezone";
import VideoComponent from "./videoComponent";
import DisplayStrip from "./displayStrip";
import {
  FULLSCREEN,
  BASE,
  BASESTRIP,
  BASELEFT,
  BASERIGHT,
  STREAM,
  RSS,
  CACHE_VERSION
} from "./variable_helper";
// import { tenantDetail } from "./tenant_helper";
import blackposter from "./blackscreen.jpeg";
import loaderposter from "./loader.jpg";
import { io } from 'socket.io-client';
import { getHostUrl } from '../environment';
import Slide from 'react-reveal/Slide';
import playerStyles from './playerStyles';

// const tenant = window.location.href.split("/")[2].split(".")[1];
const tenant = "tfw";
// const layoutOrder = tenantDetail[tenant];
const layoutOrder = true;
const emptyList = {
  loaded: true,
  allVideoList: [],
  stripImageList: [],
  leftImageList: [],
  mediaList: [],
  playCountDetail: [],
  videoPosition: 0,
  playerPosition: 0,
  position: 0
}

class Player extends Component {
  constructor(props) {
    super(props);
    this.myRef = React.createRef();
    const mode = JSON.parse(window.localStorage.getItem("mode"));
    const modePosition = JSON.parse(window.localStorage.getItem("modePosition"));
    const queryParams = _.split(window.location.search, '&');
    console.log('window.location.href', window.location.href, '<<>>')
    console.log("window.location.search", window.location.search, '<<>>')
    console.log('queryParams', queryParams, '<<>>')
    console.log("Number(queryParams[0].replace('?player_id=', ''))", Number(queryParams[0].replace('?player_id=', '')), '<<>>')
    const browser = queryParams.length > 1 && queryParams[1].replace('isBrowser=', '');
    this.state = {
      isBrowser: browser && browser === "true" ? true : false,
      mediaList: [],
      videos: [],
      loaded: false,
      player_id: Number(queryParams[0].replace('?player_id=', '')),
      mode: Number(mode),
      modePosition: Number(modePosition),
      height: window.innerHeight,
      width: window.innerWidth,
      videoPosition: 0,
      playerPosition: 0,
      playCountDetail: JSON.parse(window.localStorage.getItem("playCountDetail")) || [],
      allVideoList: [],
      stripImageList: [],
      leftImageList: [],
      position: 0,
      online: navigator.onLine,
      isSlideHide: false,
      slideRenderer: 0,
      baseStripPosition: 0,
      playingTime: 0,
      isPlayerPlaying: false,
      imagePlayedSeconds: 0,
      onceTriggered: false,
      errorIds: [],
      serverDate: window.localStorage.getItem("serverDate"),
      deviceTime: moment().format("YYYY-MM-DD HH:mm:ss")
    };
    this.endCalled = false;
    this.triggerTimer = null;
    this.endTimer = null;
    this.timer = null;
  }
  componentDidMount() {
    localStorage.setItem("rssPosition", JSON.stringify([]));
    localStorage.setItem("currentPlayerInfoId", "");
    localStorage.setItem("currentMediaId", "");
    localStorage.setItem("stripPlayerInfoId", "");
    localStorage.setItem("layout_type_id", "");
    localStorage.setItem("setPlaylistCalled", "");
    const { player_id, isBrowser } = this.state;
    this.socketInitialize('mount');
    window.addEventListener("message", message => {
      const nativeMessage = message.data;
      if (nativeMessage.hasOwnProperty("version")) {
        return this.setState({ version: nativeMessage.version, macAddress: nativeMessage.macAddress });
      } else {
        const { version, player_id } = this.state;
        const triggerData = { player_id, isBrowser };
        const deletedItem = Array.isArray(nativeMessage) ? nativeMessage : nativeMessage.mediaIds;
        let mediaList = JSON.parse(window.localStorage.getItem("mediaList"));
        mediaList = _.map(mediaList, value => {
          if (!_.includes(deletedItem, value.player_info_id))
            return value
        }).filter(i => i);
        const dowloadedList = this.checkDownloadedMedia(mediaList);
        window.localStorage.setItem("mediaList", JSON.stringify(mediaList));
        if (Number(version) < 6.9) {
          if (dowloadedList.length === 0)
            return this.setState(emptyList, () => {
              !isBrowser && window.socket.emit('previewRefresh', triggerData);
            });
          this.setPlaylistOrder(false, { mediaList: dowloadedList });
        } else {
          if (dowloadedList.length === 0)
            return this.setState(emptyList, () => {
              !isBrowser && window.socket.emit('previewRefresh', triggerData);
              this.sendPlayCountTimer();
            });
          this.sendPlayCountTimer();
        }
      }
    });

    let mediaList = JSON.parse(window.localStorage.getItem("mediaList"));
    if (!navigator.onLine) {
      if (_.some(mediaList, (value) => value.media_type === RSS)) {
        mediaList = mediaList.filter(
          (data) => (data.media_type !== RSS)
        );
      }
    }
    const player = isBrowser ? player_id : JSON.parse(window.localStorage.getItem("player_id"));
    this.getPlayerOrientation();
    this.sendPlayCountTimer();
    if (isBrowser) {
      this.setOfflineTimer = setTimeout(() => {
        this.setPlayerOffline();
      }, 45000)
    }
    this.endInterval = setInterval(() => {
      !isBrowser && this.sendPlayCountTimer();
    }, 900000);
    if (mediaList && player == player_id) {
      this.networkListener()
      const mediaListDetail = this.checkDownloadedMedia(mediaList);
      if (mediaListDetail.length === 0) return this.setState({ loaded: true });
      this.setPlaylistOrder(true, { mediaList: mediaListDetail });
    }
  }

  networkListener = () => {
    window.addEventListener('online', this.checkNetwork);
    window.addEventListener('offline', this.checkNetwork);
  }

  updateDownloadPercetage = (mediaList) => {
    const httpDownloadList = [];
    const playerMediaList = mediaList.map((media) => {
      if ((media.media_type === "HTTP" || media.media_type === RSS) && media.percentage !== 100) {
        media.percentage = 100;
        httpDownloadList.push(media);
        return media
      }
      return media
    });
    const downloadedList = playerMediaList.filter(
      (media) => media.percentage === 100
    );
    window.localStorage.setItem(
      "mediaList",
      JSON.stringify(downloadedList)
    );
    if (httpDownloadList.length) this.updateMediaPercentage(httpDownloadList);
    return playerMediaList;
  }

  checkNetwork = () => {
    const online = navigator.onLine;
    const { mediaList, isBrowser } = this.state;
    if (mediaList.length) {
      if (online && !this.state.online) {
        let media = JSON.parse(window.localStorage.getItem("mediaList"));
        if (_.some(media, (value) => value.media_type === RSS)) {
          if (media.length === 0) return this.setState({ loaded: true });
          this.setPlaylistOrder(false, { mediaList: media });
        }
      }

      if (!online && this.state.online) {
        if (_.some(mediaList, (value) => value.media_type === RSS)) {
          let media = JSON.parse(window.localStorage.getItem("mediaList"));
          const list = media.filter(
            (data) => (data.media_type !== RSS)
          );
          media = this.checkDownloadedMedia(list);
          if (media.length === 0) return this.setState({ loaded: true });
          this.setPlaylistOrder(false, { mediaList: media });
        }
      }
    }

    this.setState({ online }, () => {
      if (!isBrowser) {
        !online && this.setTriggerTimer(false);
        online && this.triggerSender();
      }
    });
  }

  updateMediaPercentage = (httpList) => {
    if (httpList.length) {
      const httpdownloadList = _.map(httpList, (media) => {
        const { player_info_id, media_type } = media;
        return {
          percentage: 100,
          player_info_id,
          media_type,
        }
      })
      axios
        .post(`${updateMediaDownloadPercentage()} `, { downloadedData: httpdownloadList })
    }
  }

  checkDownloadedMedia = (mediaList, currentDate) => {
    const { serverDate } = this.state;
    const currentTime = currentDate ? currentDate : serverDate;
    const date = currentTime && moment(currentTime).tz('Asia/Kolkata').format("YYYY-MM-DD");
    const time = moment().format("HH:mm:ss");
    const day = moment().format("dddd").toLowerCase();
    const dateHelper = (startDateValid, endDateValid, start_date, end_date) =>
      startDateValid && endDateValid && date >= start_date && date <= end_date;
    const timeHelper = (onTimeValid, onEndValid, on_time, off_time) =>
      onTimeValid && onEndValid && time >= on_time && time <= off_time;
    const dayHelper = (media) =>
      media.sunday === 0 &&
      media.monday === 0 &&
      media.tuesday === 0 &&
      media.wednesday === 0 &&
      media.thursday === 0 &&
      media.friday === 0 &&
      media.saturday === 0;
    mediaList = mediaList.filter((media) => {
      const date_dependent = media.date_dependent
      if ((date_dependent == 1)) {
        media.schedule_flag = 1;
        media.start_date = media.media_start;
        media.end_date = media.media_end;
        media.off_time = "0000-00-00 00:00:00"
        media.on_time = "0000-00-00 00:00:00";
        media.sunday = 0;
        media.monday = 0;
        media.tuesday = 0;
        media.wednesday = 0;
        media.thursday = 0;
        media.friday = 0;
        media.saturday = 0;
      }
      const startDate = moment(media.start_date).tz('Asia/Kolkata');
      const endDate = moment(media.end_date).tz('Asia/Kolkata');
      const start_date = startDate.format("YYYY-MM-DD");
      const end_date = endDate.format("YYYY-MM-DD");
      const onTime = moment(media.on_time).tz('Asia/Kolkata');
      const offTime = moment(media.off_time).tz('Asia/Kolkata');
      const on_time = onTime.format("HH:mm:ss");
      const off_time = offTime.format("HH:mm:ss");
      const onTimeValid = onTime.isValid();
      const onEndValid = offTime.isValid();
      const startDateValid = startDate.isValid();
      const endDateValid = endDate.isValid();
      return (
        (media.percentage === 100) &&
        (media.schedule_flag === 0 ||
          (media.schedule_flag === 1 &&
            dateHelper(startDateValid, endDateValid, start_date, end_date) &&
            dayHelper(media) &&
            !onTimeValid &&
            !onEndValid) ||
          (media.schedule_flag === 1 &&
            dateHelper(startDateValid, endDateValid, start_date, end_date) &&
            media[day] === 1 &&
            !onTimeValid &&
            !onEndValid) ||
          (media.schedule_flag === 1 &&
            dateHelper(startDateValid, endDateValid, start_date, end_date) &&
            media[day] === 1 &&
            timeHelper(onTimeValid, onEndValid, on_time, off_time)) ||
          (media.schedule_flag === 1 &&
            !startDateValid &&
            !endDateValid &&
            media[day] === 1 &&
            timeHelper(onTimeValid, onEndValid, on_time, off_time)) ||
          (media.schedule_flag === 1 &&
            !startDateValid &&
            !endDateValid &&
            media[day] === 1 &&
            !onTimeValid &&
            !onEndValid) ||
          (media.schedule_flag === 1 &&
            !startDateValid &&
            !endDateValid &&
            dayHelper(media) &&
            timeHelper(onTimeValid, onEndValid, on_time, off_time)) ||
          (media.schedule_flag === 1 &&
            dateHelper(startDateValid, endDateValid, start_date, end_date) &&
            dayHelper(media) &&
            timeHelper(onTimeValid, onEndValid, on_time, off_time))
        ));
    });
    const mediaListGroup = _.groupBy(mediaList, "layout_type_id");
    const downloadedList = _.flatten(
      _.map(mediaListGroup, (dowloadedLayout) => {
        const layouts = { FULLSCREEN, BASE, BASESTRIP, BASELEFT, BASERIGHT };
        const layoutValidation = (layout) =>
          _.some(
            dowloadedLayout,
            (value) => value.layout_id === layouts[layout]
          );
        if (
          layoutValidation("FULLSCREEN") ||
          (layoutValidation("BASE")) ||
          (layoutValidation("BASESTRIP") &&
            layoutValidation("BASELEFT") &&
            layoutValidation("BASERIGHT"))
        ) {
          return dowloadedLayout;
        }
      })
    ).filter((i) => i);
    return downloadedList;
  };

  sendPlayCount = (media, mediaDates) => {
    const { playCountDetail, isBrowser, online } = this.state;
    if (!isBrowser && online) {
      const date = moment().utc().format('YYYY-MM-DD');
      const value = _.find(playCountDetail, { player_info_id: media, date });
      if (value) _.find(playCountDetail, { player_info_id: media, date }).playcount = value.playcount + 1;
      else playCountDetail.push({ player_info_id: media, playcount: 1, date, mediaDates });
      this.setState({ playCountDetail }, () => {
        localStorage.setItem("playCountDetail", JSON.stringify(playCountDetail));
      });
    }
  };

  setPlaylistOrder = (from, overallData) => {
    const { mediaList, timeObjects } = overallData;
    const commonObject = timeObjects && Object.keys(timeObjects).length ? timeObjects : {};
    let allVideoList = [],
      leftImageList = [],
      stripImageList = [],
      fullScreenList = [];
    let { loop, videoPosition, playerPosition, position, baseStripPosition, isBrowser, playingTime, player_id } = this.state;
    let stripPosition = baseStripPosition;
    let mediaListGroup = _.groupBy(mediaList, "position");
    if (
      _.size(mediaListGroup) === 1 &&
      _.some(mediaListGroup[Object.keys(mediaListGroup)[0]], (value) => value.media_type !== RSS) &&
      mediaListGroup[Object.keys(mediaListGroup)[0]].filter(
        (media) =>
          media.media_type === "video" ||
          (media.media_type === "HTTP") ||
          (media.media_type === "image" && media.layout_id === FULLSCREEN)
      ).length === 1
    ) {
      loop = true;
    } else {
      loop = false;
    }
    let baseStrip = [];
    if (layoutOrder) {
      while (_.some(Object.values(mediaListGroup), (value) => value.length)) {
        for (const key in mediaListGroup) {
          if (mediaListGroup[key].length) {
            let value = mediaListGroup[key];
            const onlyBaseStrip = value.filter((item) => item.layout_id === BASESTRIP);
            if (onlyBaseStrip.length) {
              baseStrip = [...baseStrip, ...onlyBaseStrip];
              value = mediaListGroup[key].filter((item) => item.layout_id !== BASESTRIP);
            }
            const order = mediaListGroup[key][0].order_value;
            if (order === 0) {
              fullScreenList = [...fullScreenList, ...value];
              mediaListGroup = {
                ...mediaListGroup,
                ...{ [key]: [] },
              };
            } else {
              fullScreenList = [...fullScreenList, ...value.slice(0, order)];
              mediaListGroup = {
                ...mediaListGroup,
                ...{ [key]: value.splice(order, value.length) },
              };
            }
          }
        }
        if (!_.some(Object.values(mediaListGroup), (value) => value.length)) {
          stripImageList.push(baseStrip);
          allVideoList.push(fullScreenList);
          break;
        }
      }
    } else {
      _.map(mediaListGroup, (player) => {
        const playerAllVideoList = [],
          playerLeftImageList = [],
          playerStripImageList = [];
        player = _.sortBy(player, "playlist_position");
        player.forEach((media) => {
          if (media.layout_id !== BASESTRIP && media.layout_id !== BASELEFT) {
            playerAllVideoList.push(media);
          } else if (media.layout_id === BASELEFT) {
            playerLeftImageList.push(media);
          } else if (media.layout_id === BASESTRIP) {
            playerStripImageList.push(media);
          }
        });
        allVideoList.push(playerAllVideoList);
        leftImageList.push(playerLeftImageList);
        stripImageList.push(playerStripImageList);
      });
    }
    let positions;
    let isCurrentVideo;
    let currentVideo = {};
    let isDifferentPlayerInfoId;
    let validStripPosition;
    let isSamePlayerInfoId;
    let isLayoutTypeIdSame;
    let currentBaseStrip = [];
    let isBase;
    const oldLayoutTypeId = window.localStorage.getItem("layout_type_id");
    const stripPlayerInfoId = window.localStorage.getItem("stripPlayerInfoId");
    const setPlaylistCalled = window.localStorage.getItem("setPlaylistCalled");
    positions = { videoPosition, playerPosition, position };
    isCurrentVideo = (allVideoList.length - 1 >= playerPosition) && (allVideoList[playerPosition].length - 1 >= videoPosition);
    let playerPositionValue = playerPosition;
    let videoPositionValue = videoPosition;
    this.endCalled = false
    if (!isCurrentVideo) {
      this.endTimer !== null && clearTimeout(this.endTimer)
      positions = this.playerPosition(allVideoList);
      playerPositionValue = positions.playerPosition;
      videoPositionValue = positions.videoPosition;
    } else {
      const oldPlayerInfoId = window.localStorage.getItem("currentPlayerInfoId");
      const currentPlayerInfoId = allVideoList[playerPositionValue][videoPositionValue].player_info_id;
      isDifferentPlayerInfoId = Number(oldPlayerInfoId) !== currentPlayerInfoId;
      this.endTimer !== null && isDifferentPlayerInfoId && clearTimeout(this.endTimer);
    }
    currentVideo = allVideoList[playerPositionValue][videoPositionValue];
    if (currentVideo && Object.keys(currentVideo).length) {
      localStorage.setItem("currentPlayerInfoId", JSON.stringify(currentVideo.player_info_id));
      localStorage.setItem("currentMediaId", JSON.stringify(currentVideo.media_id));
      isBase = currentVideo.layout_id === BASE;
      isLayoutTypeIdSame = currentVideo.layout_type_id == oldLayoutTypeId;
      if (isBase) {
        currentBaseStrip = (Object.keys(currentVideo).length && stripImageList.length)
          ? stripImageList[0].filter((item) => item.layout_type_id === currentVideo.layout_type_id) : [];
        validStripPosition = (currentBaseStrip.length - 1) >= baseStripPosition;
        if (validStripPosition) {
          isSamePlayerInfoId = Number(stripPlayerInfoId) === currentBaseStrip[baseStripPosition].player_info_id;
          stripPosition = baseStripPosition;
          localStorage.setItem("stripPlayerInfoId", JSON.stringify(currentBaseStrip[stripPosition].player_info_id));
        } else {
          isSamePlayerInfoId = false;
          stripPosition = 0;
          currentBaseStrip.length && localStorage.setItem("stripPlayerInfoId", JSON.stringify(currentBaseStrip[stripPosition].player_info_id));
        }
        if (oldLayoutTypeId && !isLayoutTypeIdSame) {
          clearTimeout(this.timer);
        } else if (oldLayoutTypeId && isLayoutTypeIdSame && !isSamePlayerInfoId) {
          clearTimeout(this.timer);
        }
      } else {
        this.timer && clearTimeout(this.timer);
      }
      stripPosition = !isLayoutTypeIdSame ? 0 : stripPosition;
      localStorage.setItem("layout_type_id", JSON.stringify(currentVideo.layout_type_id));
      if (currentVideo.media_type == RSS)
        localStorage.setItem("rssPosition", JSON.stringify([{ player_info_id: currentVideo.player_info_id, position }]));
    }
    if (isBrowser) {
      this.endTimer !== null && clearTimeout(this.endTimer);
      if (!setPlaylistCalled) {
        localStorage.setItem("setPlaylistCalled", "called");
      } else {
        stripPosition = baseStripPosition;
        this.timer && clearTimeout(this.timer);
        if (currentVideo.media_type == "video" && from == 'previewRefresh' && this.myRef && this.myRef.current) {
          this.myRef.current.currentTime = playingTime;
        }
      }
    }
    this.setState(
      {
        allVideoList,
        leftImageList,
        stripImageList,
        loop,
        loaded: true,
        ...positions,
        mediaList,
        baseStripPosition: stripPosition,
        ...commonObject
      },
      () => {
        if (!setPlaylistCalled) {
          const triggerData = { player_id, reason: 'urlStarted', isBrowser };
          // This trigger is call when Adfarm Url started time, Adfarm Url to Player.
          isBrowser && window.socket.emit('previewRefresh', triggerData);
          localStorage.setItem("setPlaylistCalled", "called");
        }
        !isBrowser && this.triggerSender();
        ((isCurrentVideo && isDifferentPlayerInfoId) || !isCurrentVideo) && this.videoEnd(from);
        // Here SetupTimer() call for BaseStrip duration set
        if (isBase) {
          if (!isBrowser && !oldLayoutTypeId || (oldLayoutTypeId && !isLayoutTypeIdSame)) {
            this.setupTimer();
          } else if (!isBrowser && oldLayoutTypeId && isLayoutTypeIdSame && !isSamePlayerInfoId) {
            currentBaseStrip.length && this.setupTimer();
          } else if (isBrowser) {
            this.setupTimer(from);
          }
        }
      }
    );
  };

  playerPosition = (allVideoList) => {
    let playerPositions;
    let videoPositions;
    let position;
    let { videoPosition, playerPosition } = this.state;
    const rssRunning = _.get(allVideoList, `[${playerPosition}][${videoPosition}].media_type`, "") === RSS && this.endCalled;
    if (
      (playerPosition <= allVideoList.length - 1 &&
        (videoPosition < allVideoList[playerPosition].length - 1) ||
        rssRunning)
    ) {
      playerPositions = playerPosition;
      videoPositions =
        !(rssRunning) ? (videoPosition >= allVideoList[playerPositions].length - 1
          ? 0
          : videoPosition + 1) : videoPosition;
      position = this.setRSSPosition(allVideoList, playerPosition, videoPositions)
    } else if (
      playerPosition < allVideoList.length - 1 &&
      videoPosition === allVideoList[playerPosition].length - 1
    ) {
      playerPositions = playerPosition + 1;
      videoPositions = 0;
      position = this.setRSSPosition(allVideoList, playerPositions, videoPositions);

    } else {
      playerPositions = 0;
      videoPositions = 0;
      position = this.setRSSPosition(allVideoList, playerPositions, videoPositions);

    }
    return { videoPosition: videoPositions, playerPosition: playerPositions, position };
  };

  setRSSPosition = (allVideoList, playerPositions, videoPositions) => {
    const currentVideo = allVideoList[playerPositions][videoPositions];
    let position = 0;
    if (currentVideo && Object.keys(currentVideo).length && currentVideo.media_type === RSS) {
      let prevposition = JSON.parse(localStorage.getItem("rssPosition"));
      const prevVideoPosition = _.find(prevposition, value => value.player_info_id == currentVideo.player_info_id) || {};
      position =
        (currentVideo.media_url.length <= prevVideoPosition.position + 1 || !_.size(prevVideoPosition))
          ? 0
          : prevVideoPosition.position + 1
      if (!prevVideoPosition || !_.size(prevVideoPosition)) {
        prevposition.push({ player_info_id: currentVideo.player_info_id, position })
      } else {
        _.find(prevposition, value => value.player_info_id == currentVideo.player_info_id).position = position;
      }
      localStorage.setItem("rssPosition", JSON.stringify(prevposition))
    }
    return position;
  }

  onEnded = () => {
    let {
      videoPosition,
      allVideoList,
      playerPosition,
      mediaList,
      isBrowser,
      baseStripPosition,
      stripImageList,
      player_id
    } = this.state;
    const oldLayoutTypeId = window.localStorage.getItem("layout_type_id");
    const oldMediaId = window.localStorage.getItem("currentMediaId");
    if (mediaList.length === 0)
      return this.setState(emptyList);
    const isCurrentVideo = (allVideoList.length - 1 >= playerPosition) && (allVideoList[playerPosition].length - 1 >= videoPosition);
    if (isCurrentVideo && !isBrowser) {
      const { player_info_id, date_dependent, media_end, media_start, start_date, end_date } = allVideoList[playerPosition][videoPosition];
      let mediaDates = { start_date, end_date }
      if (date_dependent == 1) {
        mediaDates.start_date = media_start;
        mediaDates.end_date = media_end;
      }
      this.sendPlayCount(player_info_id, mediaDates);
    }
    const position = this.playerPosition(allVideoList);
    const nextVideo = allVideoList[position.playerPosition][position.videoPosition];
    const isSameMedia = nextVideo.media_id == oldMediaId && nextVideo.media_type === "video";
    const isBase = nextVideo.layout_id === BASE;
    const isLayoutTypeIdSame = nextVideo.layout_type_id == oldLayoutTypeId;
    const stripPosition = !isLayoutTypeIdSame ? 0 : baseStripPosition;
    const currentBaseStrip = stripImageList.length ? stripImageList[0].filter((item) => item.layout_type_id === nextVideo.layout_type_id) : [];
    const stripPlayerInfoId = (currentBaseStrip.length - 1 >= stripPosition)
      ? currentBaseStrip[stripPosition].player_info_id : "";
    !isLayoutTypeIdSame && clearTimeout(this.timer);
    if (nextVideo && Object.keys(nextVideo).length && nextVideo.media_type !== RSS) {
      const posterUrl = isBrowser ? null : `http://localhost:8080/${nextVideo.player_info_id
        }poster.jpeg`;
      const posterPercentage = nextVideo.poster_percentage;
      if (this.myRef.current && !isBrowser) {
        this.myRef.current.poster =
          posterPercentage === 100 ? posterUrl : blackposter;
      }
      this.posterTimer = setTimeout(() => {
        this.setState(
          {
            ...position,
            isSlideHide: false,
            slideRenderer: isCurrentVideo && allVideoList[playerPosition].length - 1 === videoPosition ? videoPosition : position.videoPosition,
            baseStripPosition: stripPosition
          },
          () => {
            axios
              .post(`${tvLogger()} `, {
                player_id,
                isBrowser,
                tenant,
                position: {
                  ...position,
                },
                baseStripPosition: stripPosition,
                media_name: nextVideo.media_name,
                message: 'onEnded called in PWS'
              });
            localStorage.setItem("currentPlayerInfoId", JSON.stringify(nextVideo.player_info_id));
            localStorage.setItem("currentMediaId", JSON.stringify(nextVideo.media_id));
            localStorage.setItem("stripPlayerInfoId", JSON.stringify(stripPlayerInfoId));
            localStorage.setItem("layout_type_id", JSON.stringify(nextVideo.layout_type_id));
            isBase && !isLayoutTypeIdSame && currentBaseStrip.length && this.setupTimer();
            isBrowser && isSameMedia && this.myRef.current.play();
            this.videoEnd();
            !isBrowser && window.socket.emit('endVideo', nextVideo)
          }
        );
      }, 500);
    } else {
      if (this.myRef.current) {
        this.myRef.current.poster = loaderposter;
      }
      this.setState({
        ...position
      },
        () => {
          this.videoEnd();
        });
    }
  };

  sendPlayCountTimer = (fromMount) => {
    const { playCountDetail, player_id, version, isBrowser, errorIds } = this.state;
    const params = {
      player_id,
      playCountDetail,
      version,
      isBrowser
    };
    localStorage.setItem("player_id", player_id);
    axios
      .post(`${updatePlayCount()}`, params)
      .then((res) => {
        const { isSocketWorking, serverDate } = res.data;
        const timeObjects = { serverDate, deviceTime: moment().format("YYYY-MM-DD HH:mm:ss") };
        axios.post(`${tvLogger()} `, { player_id, isBrowser, tenant, errorIds, message: `updatePlayCount API success PWS || total mediaList:${res.data.data.length},cversion:${CACHE_VERSION}`, params, isSocketWorking });
        !isBrowser && !isSocketWorking && this.socketRestart();
        localStorage.setItem("playCountDetail", JSON.stringify([]));
        localStorage.setItem("serverDate", serverDate);
        if (!fromMount && !res.data.reset_flag) {
          if (res.data.data.length === 0) {
            return this.setState({ loaded: true, playCountDetail: [], ...timeObjects }, () => {
              !isBrowser && window.socket.emit('previewRefresh', { player_id, isBrowser });
            });
          }
          const checkDownloadPercentage = this.updateDownloadPercetage(res.data.data);
          const mediaList = this.checkDownloadedMedia(checkDownloadPercentage, serverDate);
          if (!_.isEqual(mediaList, this.state.mediaList)) {
            if (mediaList.length === 0) {
              return this.setState({ ...emptyList, ...timeObjects }, () => {
                !isBrowser && window.socket.emit('previewRefresh', { player_id, isBrowser });
              });
            }
            if (this.state.mediaList.length == 1 && mediaList[0].media_type == RSS) {
              this.endCalled = false
            }
            timeObjects.playCountDetail = [];
            this.setPlaylistOrder(false, { mediaList, timeObjects });
          } else {
            this.setState({ playCountDetail: [], ...timeObjects });
          }
        }
      })
      .catch((error) => {
        const { serverDate } = this.state;
        axios.post(`${tvLogger()} `, { player_id, isBrowser, tenant, errorIds, message: `err - updatePlayCount PWS`, error, serverDate, params });
        if (serverDate) {
          const timeObjects = { serverDate: this.getServerDate(), deviceTime: moment().format("YYYY-MM-DD HH:mm:ss") };
          localStorage.setItem("serverDate", timeObjects.serverDate);
          if (!fromMount) {
            let mediaList = JSON.parse(window.localStorage.getItem("mediaList"));
            if (mediaList) {
              mediaList = this.checkDownloadedMedia(mediaList, timeObjects.serverDate);
              if (!this.state.online) mediaList = mediaList.filter(
                (media) => (media.media_type !== RSS)
              );
              if (mediaList.length === 0)
                return this.setState({ ...emptyList, ...timeObjects });
              if (!_.isEqual(mediaList, this.state.mediaList)) {
                if (this.state.mediaList.length == 1 && mediaList[0].media_type === RSS) {
                  this.endCalled = false
                }
                this.setPlaylistOrder(false, { mediaList, timeObjects });
              } else {
                this.setState(timeObjects);
              }
            }
          }
        }
      });
  };

  videoEnd = (from) => {
    const { videoPosition, allVideoList, playerPosition, mediaList, imagePlayedSeconds } = this.state;
    const currentAllVideoList = allVideoList[playerPosition] || [];

    if ((currentAllVideoList.length - 1 >= videoPosition) &&
      currentAllVideoList[videoPosition].media_type !== "video" &&
      currentAllVideoList[videoPosition].type_id !== STREAM &&
      ((mediaList.length != 1 && currentAllVideoList[videoPosition].media_type === RSS)
        || (currentAllVideoList[videoPosition].media_type === "image"))
    ) {
      this.endTimer && clearTimeout(this.endTimer);
      this.endTimer = null;
      if (mediaList.length == 1 && currentAllVideoList[videoPosition].media_type == RSS) return
      const currentVideo = currentAllVideoList[videoPosition] || {}
      localStorage.setItem("currentPlayerInfoId", currentAllVideoList[videoPosition].player_info_id.toString());
      localStorage.setItem("currentMediaId", currentAllVideoList[videoPosition].media_id.toString());
      this.imageDuration = moment().format("HH:mm:ss");
      const mediaDuration = currentVideo.media_duration;
      const duration = from == 'previewRefresh' ? mediaDuration - imagePlayedSeconds : mediaDuration;
      this.endTimer = setTimeout(() => {
        this.onEnded();
      }, duration * 1000);
    } else if (currentAllVideoList.length == 0) {
      this.onEnded();
    }
  };

  componentWillUnmount() {
    const { isBrowser, player_id } = this.state;
    axios.post(`${tvLogger()} `, { player_id, isBrowser, tenant, message: `Unmounted called PWS` })
    clearTimeout(this.endTimer);
    clearTimeout(this.posterTimer);
    clearTimeout(this.timer);
    !isBrowser && clearTimeout(this.triggerTimer);
    isBrowser && clearTimeout(this.setOfflineTimer);
  }

  errorMediaDownload = async (media, error) => {
    const { player_id, isBrowser, allVideoList, stripImageList, baseStripPosition, errorIds, mediaList } = this.state;
    let { playerPosition, videoPosition, } = this.state;
    const { player_info_id, media_id } = media;
    const totalErrorIds = errorIds.includes(player_info_id) ? errorIds : [...errorIds, player_info_id];
    const isStrip = media.layout_id === BASESTRIP;
    const newMediaList = mediaList.filter((item) => item.player_info_id !== player_info_id);
    const logData = {
      player_id,
      isBrowser,
      tenant,
      player_info_id,
      media_id,
      errorIds,
      errorMessage: "",
      message: `err - Media is not playing PWS`,
    }
    if (error.target.error && Object.keys(error.target.error).length) {
      logData.errorMessage = error.target.error.message;
      logData.errorCode = error.target.error.code;
    }
    if (isStrip) {
      const currentBaseStrip = this.getCurrentStrip();
      const stripPosition = ((currentBaseStrip.length - 1 > baseStripPosition) ? baseStripPosition : 0);
      const stripRemove = stripImageList.map((item) => item.filter((i) => i.player_info_id !== player_info_id));
      this.setState({ stripImageList: stripRemove, baseStripPosition: stripPosition, errorIds: totalErrorIds, mediaList: newMediaList }, () => {
        this.setupTimer();
        axios.post(`${tvLogger()}`, logData);
      });
    } else {
      const isOldMediaBase = this.getCurrentVideo(playerPosition, videoPosition).layout_id === BASE;
      const oldMediaId = window.localStorage.getItem("currentMediaId");
      const mediaRemove = allVideoList.map((item) => item.filter((i) => i.player_info_id !== player_info_id));
      const isPositionAvailable = mediaRemove[playerPosition].length - 1 >= videoPosition;
      if (!isPositionAvailable) {
        const position = this.playerPosition(mediaRemove);
        playerPosition = position.playerPosition;
        videoPosition = position.videoPosition;
      }
      if (mediaRemove[playerPosition].length === 0)
        return this.setState(emptyList);
      const isSameMedia = mediaRemove[playerPosition].media_id == oldMediaId && mediaRemove[playerPosition].media_type === "video";
      this.setState({ allVideoList: mediaRemove, playerPosition, videoPosition, errorIds: totalErrorIds, mediaList: newMediaList }, () => {
        const { stripPosition } = this.state;
        const currentBaseStrip = this.getCurrentStrip();
        const stripPlayerInfoId = (currentBaseStrip.length - 1 >= stripPosition)
          ? currentBaseStrip[stripPosition].player_info_id : "";
        const currentVideo = this.getCurrentVideo(playerPosition, videoPosition);
        const isNewMediaBase = currentVideo.layout_id === BASE;
        !isOldMediaBase && isNewMediaBase && this.setupTimer();
        localStorage.setItem("currentPlayerInfoId", JSON.stringify(currentVideo.player_info_id));
        localStorage.setItem("currentMediaId", JSON.stringify(currentVideo.media_id));
        localStorage.setItem("stripPlayerInfoId", JSON.stringify(stripPlayerInfoId));
        localStorage.setItem("layout_type_id", JSON.stringify(currentVideo.layout_type_id));
        this.endTimer && clearTimeout(this.endTimer);
        this.videoEnd();
        isBrowser && isSameMedia && this.myRef.current.play();
        !isBrowser && window.socket.emit('endVideo', currentVideo);
        axios.post(`${tvLogger()}`, logData);
      });
    }
  };

  getPlayerOrientation = async () => {
    const { player_id, isBrowser } = this.state;
    await axios
      .get(`${getPlayerOrientation()}?player_id=${player_id}&version=${CACHE_VERSION}&isBrowser=${isBrowser}`)
      .then((res) => {
        const { mode, mode_position } = res.data.data[0];
        localStorage.setItem("mode", mode.toString());
        localStorage.setItem("modePosition", mode_position.toString());
        this.setState({ mode, modePosition: mode_position });
      }).catch((e) => console.log('error in getPlayerOrientation', e))
  }

  setupTimer = (from) => {
    // Here BaseStrip duration set
    this.timer && clearTimeout(this.timer);
    this.timer = null;
    const { stripImageList, allVideoList, playerPosition, videoPosition, baseStripPosition, stripPlayedSeconds } = this.state;
    const currentAllVideoList = allVideoList[playerPosition] || [];
    const currentVideo = currentAllVideoList[videoPosition] || {}
    const currentBaseStrip = stripImageList.length ? stripImageList[0].filter((item) => item.layout_type_id === currentVideo.layout_type_id) : [];
    if (currentBaseStrip.length > 0) {
      this.baseStripTime = moment().format("HH:mm:ss");
      const mediaDuration = currentBaseStrip[baseStripPosition].media_duration;
      const duration = from ? mediaDuration - stripPlayedSeconds : mediaDuration;
      this.timer = setTimeout(() => {
        this.animate();
      }, duration * 1000);
    }
  };
  animate = () => {
    // Here end BaseStrip
    const { stripImageList, allVideoList, playerPosition, videoPosition, baseStripPosition, isBrowser, mediaList, player_id } = this.state;
    const currentAllVideoList = allVideoList[playerPosition] || [];
    const currentVideo = currentAllVideoList[videoPosition] || {}
    const currentBaseStrip = stripImageList.length ? stripImageList[0].filter((item) => item.layout_type_id === currentVideo.layout_type_id) : [];
    const isPlayerInfoId = currentBaseStrip.length - 1 >= baseStripPosition;
    const oldLayoutTypeId = window.localStorage.getItem("layout_type_id");
    const isLayoutTypeIdSame = currentVideo.layout_type_id == oldLayoutTypeId;
    if (!isBrowser && isPlayerInfoId) {
      const { player_info_id, date_dependent, media_end, media_start, start_date, end_date } = currentBaseStrip[baseStripPosition];
      let mediaDates = { start_date, end_date }
      if (date_dependent == 1) {
        mediaDates.start_date = media_start;
        mediaDates.end_date = media_end;
      }
      this.sendPlayCount(player_info_id, mediaDates);
    }
    const stripPosition = isLayoutTypeIdSame
      ? ((currentBaseStrip.length - 1 > baseStripPosition) ? baseStripPosition + 1 : 0)
      : 0;
    const stripPlayerInfoId = isPlayerInfoId ? currentBaseStrip[stripPosition].player_info_id : "";
    currentBaseStrip.length && localStorage.setItem("stripPlayerInfoId", JSON.stringify(stripPlayerInfoId));
    this.setState({ baseStripPosition: stripPosition }, () => {
      this.setupTimer();
    });
  };

  clearLocalVariable = () => {
    const { player_id, isBrowser } = this.state;
    axios.post(`${tvLogger()} `, { player_id, isBrowser, tenant, message: `Cleared LocalStorage PWS` });
    localStorage.clear();
    window.location.reload(true);
  }

  convertTimeToSeconds = (time) => {
    const [hours, minutes, seconds] = time.split(':');
    return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds);
  };

  // Here set player is in offline(Only Adfarm Url)
  setPlayerOffline = () => {
    this.setState({ isPlayerPlaying: false, onceTriggered: true });
  }

  // This function for send trigger Player to AdfarmURL
  triggerSender = () => {
    this.setTriggerTimer(true);
    const { player_id, isBrowser, mediaList, videoPosition, playerPosition, baseStripPosition, allVideoList, stripImageList, online, mode } = this.state;
    if (online) {
      const baseStripTime = this.baseStripTime ? this.baseStripTime : moment().format("HH:mm:ss");
      const currentTime = moment().format("HH:mm:ss");
      const imageTime = this.imageDuration ? this.imageDuration : moment().format("HH:mm:ss");
      const currentAllVideoList = allVideoList[playerPosition] || [];
      const nextVideo = currentAllVideoList[videoPosition] || {}
      const playingTime = (this.myRef.current && this.myRef.current.currentTime && this.myRef.current.currentTime !== NaN) ? this.myRef.current.currentTime : 0;
      const position = { videoPosition, playerPosition, baseStripPosition, stripPosition: baseStripPosition }
      const triggerData = {
        player_id,
        isBrowser,
        triggerTo: 'previewRefresh',
        nextVideo,
        mediaList,
        position,
        playingTime,
        allVideoList,
        stripImageList,
        currentTime,
        baseStripTime,
        imageTime,
        mode
      };
      window.socket.emit('previewRefresh', triggerData);
    }
  }

  // This funtion for receive trigger AdfarmURL from Player
  triggerReceiver = (data) => {
    clearTimeout(this.setOfflineTimer);
    this.setOfflineTimer = null;
    this.setOfflineTimer = setTimeout(() => {
      this.setPlayerOffline();
    }, 50000)
    const { mediaList, position, playingTime, nextVideo, currentTime, baseStripTime, imageTime, mode, allVideoList, stripImageList } = data;
    const downloadedList = (Array.isArray(mediaList) && mediaList.length) ? mediaList : [];
    if (downloadedList.length === 0) {
      window.localStorage.setItem("mediaList", JSON.stringify(downloadedList));
      this.setState(emptyList);
    } else {
      const { videoPosition, playerPosition, stripPosition } = position;
      const currentTiming = this.convertTimeToSeconds(currentTime);
      const imageStartedTime = this.convertTimeToSeconds(imageTime);
      const imagePlayedSeconds = currentTiming - imageStartedTime;
      const stripStartTime = this.convertTimeToSeconds(baseStripTime);
      const stripPlayedSeconds = currentTiming - stripStartTime;
      let currentPlayingTime = playingTime;
      if (nextVideo && Object.keys(nextVideo).length && nextVideo.media_type === 'video' && (nextVideo.media_duration > playingTime)) {
        currentPlayingTime = playingTime;
      }
      this.setState({
        videoPosition,
        playerPosition,
        baseStripPosition: stripPosition ? stripPosition : 0,
        playingTime: currentPlayingTime,
        stripPlayedSeconds,
        imagePlayedSeconds,
        isPlayerPlaying: true,
        onceTriggered: true,
        mode,
        allVideoList,
        stripImageList
      }, () => {
        if (!_.isEqual(downloadedList, this.state.mediaList)) {
          window.localStorage.setItem("mediaList", JSON.stringify(downloadedList));
          this.setPlaylistOrder('previewRefresh', { mediaList });
        } else {
          if (nextVideo.media_type == "video" && this.myRef && this.myRef.current) {
            this.myRef.current.currentTime = currentPlayingTime;
          }
          this.videoEnd('previewRefresh');
          nextVideo.layout_id === BASE && this.setupTimer('previewRefresh');
        }
      });
    }
  }

  // Here Timer set for send preview triggers
  setTriggerTimer = (isPlaying) => {
    const { online } = this.state;
    this.triggerTimer !== null && clearTimeout(this.triggerTimer);
    this.triggerTimer = null;
    if (isPlaying && online) {
      this.triggerTimer = setTimeout(() => {
        this.triggerSender();
      }, 30000);
    }
  }

  socketRestart = async () => {
    await window.socket.disconnect();
    this.socketInitialize('restart');
  }

  socketInitialize = (from) => {
    const apiUrl = getHostUrl();
    const { protocol, hostname } = window.location;
    const { player_id, isBrowser } = this.state;
    axios.post(`${tvLogger()} `, {
      player_id,
      isBrowser,
      tenant,
      from,
      message: `API url connection test PWS || apiUrl:${apiUrl},protocol:${protocol},HN:${hostname}`,
    })
    //socket connection
    window.socket = io(`${apiUrl}`, {
      transports: ['websocket'],
      query: {
        player_id,
        apiUrl,
        protocol,
        hostname,
        isBrowser
      }
    });
    window.socket.on("connect", (data) => {
      const { player_id } = this.state;
      axios.post(`${tvLogger()} `, {
        player_id,
        isBrowser,
        tenant,
        message: `socket connections PWS || data:${data}`,
      })
    });

    window.socket.on('playerinitiateSocket', (data) => {
      const { player_info_id } = data;
      const { allVideoList, baseStripPosition, stripImageList } = this.state;
      const oldLayoutTypeId = window.localStorage.getItem("layout_type_id");
      let currentVideo = {};
      let videoPosition = 0;
      let playerPosition = 0;
      let stripPosition = 0;
      let currentBaseStrip = [];
      let validStripPosition;
      if (allVideoList.length) {
        const videoPositionStatus = allVideoList[0].map((item, index) => item.player_info_id === player_info_id && `${index}`);
        const newVideoPosition = videoPositionStatus.filter((item) => typeof item === 'string' && item)
        videoPosition = newVideoPosition.length ? Number(newVideoPosition[0]) : 0;
      }
      (this.endTimer !== null) && clearTimeout(this.endTimer);
      this.endCalled = false;
      const isCurrentVideo = (allVideoList.length - 1 >= playerPosition) && (allVideoList[playerPosition].length - 1 >= videoPosition);
      currentVideo = isCurrentVideo ? allVideoList[playerPosition][videoPosition] : {};
      const isBase = isCurrentVideo && currentVideo.layout_id === BASE;
      const isLayoutTypeIdSame = isCurrentVideo && currentVideo.layout_type_id == oldLayoutTypeId;
      if (isBase) {
        currentBaseStrip = (Object.keys(currentVideo).length && stripImageList.length)
          ? stripImageList[0].filter((item) => item.layout_type_id === currentVideo.layout_type_id) : [];
        validStripPosition = (currentBaseStrip.length - 1) >= baseStripPosition;
        if (validStripPosition) {
          stripPosition = baseStripPosition;
        }
      }
      this.timer && !isLayoutTypeIdSame && clearTimeout(this.timer);
      this.setState({ videoPosition, playerPosition, baseStripPosition: !isLayoutTypeIdSame ? 0 : baseStripPosition, isSlideHide: true, slideRenderer: videoPosition }, () => {
        this.videoEnd();
        isBase && !isLayoutTypeIdSame && currentBaseStrip.length && this.setupTimer();
        currentBaseStrip.length && localStorage.setItem("stripPlayerInfoId", JSON.stringify(currentBaseStrip[stripPosition].player_info_id));
        localStorage.setItem("layout_type_id", JSON.stringify(currentVideo.layout_type_id));
        localStorage.setItem("currentPlayerInfoId", JSON.stringify(currentVideo.player_info_id));
        localStorage.setItem("currentMediaId", JSON.stringify(currentVideo.media_id));
      });
    });

    window.socket.on('publishMedia', (player_id) => {
      !isBrowser && window.ReactNativeWebView.postMessage(player_id);
    });

    window.socket.on('refreshAllPlayers', () => {
      !isBrowser && this.sendPlayCountTimer();
    });

    window.socket.on('previewReceiver', (data) => {
      isBrowser && this.triggerReceiver(data);
    });

    window.socket.on('previewNotPlaying', () => {
      !isBrowser && this.setTriggerTimer(false);
    });

    //This is a receiver for Player from Adfarm Url. This socket call when Adfarm Url started time.
    window.socket.on('urlStarted', () => {
      !isBrowser && this.triggerSender();
    });

    window.socket.on('notPlaying', () => {
      isBrowser && this.setState({ isPlayerPlaying: false, onceTriggered: true });
    });

    window.socket.on('clearLocalVariable', () => {
      this.clearLocalVariable();
    });

    window.socket.on('orientation', () => {
      this.getPlayerOrientation();
    });

    window.socket.on('connect_error', () => {
      const { player_id } = this.state;
      axios.post(`${tvLogger()}`, { player_id, isBrowser, tenant, message: `err - connect_error in socket PWS` })
    });

    window.socket.on('disconnect', reason => {
      const { player_id } = this.state;
      axios.post(`${tvLogger()}`, { player_id, isBrowser, tenant, message: `Socket has been Disconnect PWS` })
    });
  }

  getCurrentVideo = (playerPosition, videoPosition) => {
    const { allVideoList } = this.state;
    return allVideoList[playerPosition][videoPosition];
  }

  getCurrentStrip = () => {
    const { stripImageList, playerPosition, videoPosition } = this.state;
    const currentVideo = this.getCurrentVideo(playerPosition, videoPosition);
    return stripImageList.length ? stripImageList[0].filter((item) => item.layout_type_id === currentVideo.layout_type_id) : [];
  }

  convertDateToSeconds = (oldTimeString, newTimeString) => {
    // Calculate the difference in seconds
    const oldTime = moment(oldTimeString, "YYYY-MM-DD HH:mm:ss");
    const newTime = moment(newTimeString, "YYYY-MM-DD HH:mm:ss");
    return newTime.diff(oldTime, 'seconds');
  }

  getServerDate = () => {
    const { serverDate, deviceTime } = this.state;
    const differentSeconds = this.convertDateToSeconds(deviceTime, moment().format("YYYY-MM-DD HH:mm:ss"));
    const originalUtcDate = new Date(serverDate);
    const newUtcDate = new Date(originalUtcDate.getTime() + differentSeconds * 1000);
    return newUtcDate.toISOString();
  }

  render() {
    const {
      width,
      height,
      videoPosition,
      position,
      mediaList,
      loaded,
      loop,
      allVideoList,
      stripImageList,
      leftImageList,
      playerPosition,
      macAddress,
      isBrowser,
      mode,
      modePosition,
      isSlideHide,
      slideRenderer,
      baseStripPosition,
      isPlayerPlaying,
      onceTriggered
    } = this.state;
    if (loaded && mediaList.length === 0)
      return (
        <div style={playerStyles.warningContent}>
          Device content unavailable. Please contact your signage provider with Error Code: 01-({macAddress})
        </div>
      );
    let videoHeight = height;
    let videoWidth = width;
    let videoLeft = 0;
    let previousVideo;
    const currentAllVideoList = allVideoList[playerPosition] || [];
    const currentLeftImageList = leftImageList[playerPosition] || [];
    const currentVideo = currentAllVideoList[videoPosition] || {}
    const currentBaseStrip = (Object.keys(currentVideo).length && stripImageList.length)
      ? stripImageList[0].filter((item) => item.layout_type_id === currentVideo.layout_type_id) : [];
    const isPlayerInfoId = currentBaseStrip.length - 1 >= baseStripPosition;
    if (videoPosition > 0) previousVideo = currentAllVideoList[videoPosition - 1] || {};
    if (
      (currentAllVideoList.length &&
        currentVideo.layout_id === 1 && !mode) ||
      (currentAllVideoList.length &&
        currentVideo.layout_id === 1 && isBrowser)
    ) {
      if (currentBaseStrip.length) videoHeight = height * (600 / 720);
    }
    else if (
      currentAllVideoList.length &&
      currentVideo.layout_id === 1 && mode &&
      currentBaseStrip.length &&
      !isBrowser
    )
      videoWidth = width * 0.88;
    else if (
      currentAllVideoList.length &&
      currentVideo.layout_id === 5
    ) {
      videoHeight = height * (600 / 720);
      videoWidth = width * 0.5;
      videoLeft = width * 0.5;
    }
    const divHeight = (mode && !isBrowser) ? videoHeight : 'none';
    const commonTransform = (mode && !isBrowser) ? "rotate(270deg)" : "rotate(0deg)";
    const mediaTransform = (mode && modePosition && !isBrowser) ? "rotate(180deg)" : "rotate(0deg)";
    const commonVideoWidth = (mode && !isBrowser) ? videoHeight : videoWidth;
    const commonVideoHeight = (mode && !isBrowser) ? videoWidth : videoHeight;
    let commonMediaWidth = commonVideoWidth;
    let containerColor = currentVideo.media_type === "image" ? "#FFFFFF" : "#000";
    const videoObjectFit = "fill";
    const isPreviousVideo = previousVideo && Object.keys(previousVideo).length && previousVideo.media_type == "image" && !isSlideHide;
    const previousVideoValue = isPreviousVideo ? previousVideo.player_info_id : currentVideo.player_info_id;
    const previousVideoExtension = isPreviousVideo ? previousVideo.media_url.split(".").pop()
      : Object.keys(currentVideo).length && currentVideo.media_url.split(".").pop();
    const previousVideoMURL = isPreviousVideo ? previousVideo.media_url : currentVideo.media_url;
    if (isBrowser && mode) {
      commonMediaWidth = commonMediaWidth / 2.5;
      containerColor = "#000";
    }

    if ((!loaded || Object.keys(currentVideo).length === 0) || (isBrowser && !onceTriggered)) return <div>Loading...</div>;
    const mainBaseStrip = (
      <div style={{ display: 'flex', transform: mediaTransform, justifyContent: 'center' }}>
        {currentAllVideoList.length && currentBaseStrip.length &&
          (currentVideo.layout_id === 1 || currentVideo.layout_id === 5) && (
            <DisplayStrip
              mode={mode}
              imageList={currentBaseStrip}
              baseStripPosition={baseStripPosition}
              isPlayerInfoId={isPlayerInfoId}
              onError={this.errorMediaDownload}
              isBrowser={isBrowser}
            />
          )
        }
      </div>
    );

    if (isBrowser && !isPlayerPlaying && onceTriggered) {
      return (
        <div style={playerStyles.warningContent}>
          This player is offline.
        </div>
      );
    }

    return (
      <>
        <div style={{ fontSize: 0, backgroundColor: containerColor, height: divHeight, width: commonVideoWidth, transform: commonTransform }}>
          {!isBrowser && (currentBaseStrip.length - 1 >= baseStripPosition) && mode && modePosition && mainBaseStrip}
          {(currentLeftImageList.length && currentVideo.layout_id === 5)
            || (currentAllVideoList.length
              && (currentVideo.media_type === "video" || currentVideo.media_type === RSS)) && (
              <div style={{ display: "flex", height: commonVideoHeight, width: commonVideoWidth, transform: mediaTransform, backgroundColor: "#000", justifyContent: 'center' }}>
                {currentLeftImageList.length &&
                  currentVideo.layout_id === 5 && (
                    <DisplayStrip
                      isBrowser={isBrowser}
                      left
                      errorMediaDownload={this.errorMediaDownload}
                      imageList={currentLeftImageList}
                      mediaList={mediaList}
                    />
                  )}
                {currentAllVideoList.length &&
                  ((currentVideo.media_type === "video")
                    ||
                    (currentVideo.media_type === RSS)
                  )
                  && (
                    <VideoComponent
                      loop={loop}
                      commonVideoHeight={commonVideoHeight}
                      commonVideoWidth={commonMediaWidth}
                      videoObjectFit={videoObjectFit}
                      isBrowser={isBrowser}
                      myref={this.myRef}
                      videoPosition={videoPosition}
                      url={isBrowser ? currentVideo.media_url : currentVideo.media_type === RSS ?
                        currentVideo.media_url[position] :
                        `http://localhost:8080/${currentVideo.player_info_id
                        }.${currentVideo.media_url
                          .split(".")
                          .pop()}`
                      }
                      posterPercentage={
                        currentVideo.poster_percentage
                      }
                      mediaType={currentVideo.media_type}
                      onEnded={this.onEnded}
                      onError={(err) =>
                        this.errorMediaDownload(
                          currentAllVideoList[videoPosition],
                          err
                        )
                      }
                      videoLeft={videoLeft}
                    />
                  )}
              </div>
            )}
          {currentAllVideoList.length &&
            currentVideo.media_type === "image" && (
              <div style={{ display: "flex", height: commonVideoHeight, width: commonVideoWidth, transform: mediaTransform, justifyContent: 'center' }}>
                {previousVideoValue && <img
                  src={isBrowser ? previousVideoMURL : `http://localhost:8080/${previousVideoValue}.${previousVideoExtension}`}
                  style={{
                    zIndex: 0,
                    position: 'relative',
                    height: commonVideoHeight,
                    width: commonMediaWidth
                  }}
                  onClick={() => document.body.requestFullscreen()}
                  onError={(err) =>
                    previousVideo && this.errorMediaDownload(
                      previousVideo,
                      err
                    )
                  }
                ></img>
                }
                <Slide top={!isSlideHide} spy={slideRenderer}>
                  <img
                    src={isBrowser ? currentVideo.media_url : `http://localhost:8080/${currentVideo.player_info_id
                      }.${currentVideo.media_url.split(".").pop()}`
                    }
                    style={{
                      top: 0,
                      position: 'absolute',
                      height: commonVideoHeight,
                      width: commonMediaWidth
                    }}
                    onClick={() => document.body.requestFullscreen()}
                    onError={(err) =>
                      this.errorMediaDownload(
                        currentVideo,
                        err
                      )
                    }
                  ></img>
                </Slide>
              </div>
            )}
          {currentAllVideoList.length &&
            (currentVideo.media_type == "HTTP") &&
            (
              <div style={{ display: "flex", justifyContent: 'center' }}>
                <Iframe
                  url={currentVideo.media_url}
                  width={`${videoWidth}px`}
                  height={`${videoHeight}px`}
                  styles={{ left: videoLeft }}
                  id={videoPosition}
                />
              </div>
            )}
          {!isBrowser && (currentBaseStrip.length - 1 >= baseStripPosition) && ((mode && !modePosition) || !mode) && mainBaseStrip}
          {isBrowser && (currentBaseStrip.length - 1 >= baseStripPosition) && mainBaseStrip}
        </div>
      </>
    );
  }
}
export default Player;
