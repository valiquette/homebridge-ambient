import PlatformAmbient from './ambientplatform.js'
//import pluginInfo from './package.json' with { type: "json" }

export default (homebridge) => {
	let PlatformAccessory = homebridge.platformAccessory
	let Service = homebridge.hap.Service
	let Characteristic = homebridge.hap.Characteristic
	let UUIDGen = homebridge.hap.uuid

	//let PluginName = pluginInfo.name
	//let PluginVersion = pluginInfo.version
	let PluginName = 'homebridge-ambient-realtime' //pluginInfo.name
	let PluginVersion = '0.1.3'
	let PlatformName = 'ambient'
	homebridge.registerPlatform(PluginName, PlatformName, PlatformAmbient, true)
}