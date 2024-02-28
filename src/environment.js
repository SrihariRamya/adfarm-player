export const apiPath = '/uberapi/v1';

export const getAPIUrl = () => {
  // const { protocol, hostname } = window.location;
  // let { port } = window.location;
  // if (hostname.includes('localhost')) {
  //   port = 7005
  // }

  // const tenant = window.location.href.split("/")[2].split(".")[1];
  // if (tenant != 'adfarm' && !(hostname.includes('localhost'))) {
  //   if (hostname.includes('dev')) {
  //     return `${protocol}//dev-player.${tenant}.com${apiPath}`;
  //   } else if (hostname.includes('staging')) {
  //     return `${protocol}//staging-player.${tenant}.com${apiPath}`;
  //   } else if (hostname.includes('preprod-v2')) {
  //     return `${protocol}//preprod-v2-player.${tenant}.com${apiPath}`;
  //   } else if (hostname.includes('preprod')) {
  //     return `${protocol}//preprod-player.${tenant}.com${apiPath}`;
  //   } else {
  //     return `${protocol}//player.${tenant}.com${apiPath}`;
  //   }
  // } else {
  // return `${protocol}//${hostname}:${port}${apiPath}`;
  return `https://preprod-player.thefuturewall.com/uberapi/v1`
  // return `http://192.168.2.135:7005/uberapi/v1`;
  // }
};

export const getHostUrl = () => { 
  // const { protocol, hostname } = window.location;
  // let { port } = window.location;
  // if (hostname.includes('localhost')) {
  //   port = 7005
  // }
  // const tenant = window.location.href.split("/")[2].split(".")[1];
  // if (tenant != 'adfarm' && !(hostname.includes('localhost'))) {
  //   if (hostname.includes('dev')) {
  //     return `${protocol}//dev-player.${tenant}.com`;
  //   } else if (hostname.includes('staging')) {
  //     return `${protocol}//staging-player.${tenant}.com`;
  //   } else if (hostname.includes('preprod-v2')) {
  //     return `${protocol}//preprod-v2-player.${tenant}.com`;
  //   } else if (hostname.includes('preprod')) {
  //     return `${protocol}//preprod-player.${tenant}.com`;
  //   } else {
  //     return `${protocol}//player.${tenant}.com`;
  //   }
  // } else {
  // return `${protocol}//${hostname}:${port}`;
  return `https://preprod-player.thefuturewall.com`;
    // return `http://192.168.2.135:7005`;
  // }
}