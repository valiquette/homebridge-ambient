import type { API } from 'homebridge';

import { ambientPlatform } from './ambient_platform.js';
import { PLATFORM_NAME } from './settings.js';

/**
 * This method registers the platform with Homebridge
 */
export default (api: API) => {

	//api.registerPlatform(PluginName, PlatformName, PlatformAmbient)
  api.registerPlatform(PLATFORM_NAME, ambientPlatform);
};



/*
import PlatformAmbient from './ambientplatform'
//import { name, version } from '../package.json'
import { API} from 'homebridge';
let name = "homebridge-weather-realtime"
let version = "0.2.0"

export default ( api:API) => {
	let PlatformAccessory = api.platformAccessory
	let Service = api.hap.Service
	let Characteristic = api.hap.Characteristic
	let UUIDGen = api.hap.uuid
	let PluginName = name
	let PluginVersion = version
	let PlatformName = 'ambient_rt'
	api.registerPlatform(PluginName, PlatformName, PlatformAmbient)
}
*/