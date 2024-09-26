const PlatformAmbient = require('homebridge-ambient-realtime/ambientplatform')
const packageJson = require('./package')

module.exports = (homebridge) => {
	PlatformAccessory = homebridge.platformAccessory
	Service = homebridge.hap.Service
	Characteristic = homebridge.hap.Characteristic
	UUIDGen = homebridge.hap.uuid
	PluginName = packageJson.name
	PluginVersion = packageJson.version
	PlatformName = 'ambient'
	homebridge.registerPlatform(PluginName, PlatformName, PlatformAmbient, true)
}