
import { getAPIUrl } from './environment';

const apiUrl = getAPIUrl();

export const tvLogger = () => {
    return `${apiUrl}/adfarmTvLogs`;
}



export const getMediaPlayList = () => {
    return `${apiUrl}/getMediaPlayList`;
}
export const downloadMedia = () => {
    return `${apiUrl}/media/download`
}
export const updateMediaDownloadPercentage = () => {
    return `${apiUrl}/updateMediaDownloadPercentage`;
}
export const getLoginUser = () => {
    return `${apiUrl}/user/login`;
}

export const updatePlayCount = () => {
    return `${apiUrl}/updatePlayCount`;
}

export const getMetaData = () => {
    return `${apiUrl}/getMetaData?source=login`;
}

export const getSignedUrl= () => {
    return `${apiUrl}/getSignedUrl`;
}

export const getPlayerOrientation = () => {
    return `${apiUrl}/getPlayerOrientation`;
}
