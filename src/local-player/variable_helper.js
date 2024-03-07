export const FULLSCREEN = 4;
export const BASE = 1;
export const BASESTRIP = 2;
export const BASELEFT = 3;
export const BASERIGHT = 5;
export const STREAM = 2;
export const RSS = "RSS";
export const CACHE_VERSION = 6.9;
// export const PLAYER_ID = getPlayerData(true);
// export const IS_BROWSER = getPlayerData();
// export const TENANT = window.location.href.split("/")[2].split(".")[1];

// const getPlayerData = (isPlayerId) => {
//     const queryParams = _.split(window.location.search, '&');
//     const browser = queryParams.length > 1 && queryParams[1].replace('isBrowser=', '');
//     const isBrowser = browser && browser === "true" ? true : false;
//     const player_id = Number(queryParams[0].replace('?player_id=', ''))
//     return isPlayerId ? player_id : isBrowser;
// }
