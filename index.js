const PlatformAmbient = require('./ambientplatform.cjs')
const packageJson = require('./package.json')

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