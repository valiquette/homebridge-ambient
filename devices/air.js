
class sensor {
	constructor(platform, log) {
		this.log = log
		this.platform = platform
	}

	createSensorService(weatherStation,device,type) {
		this.log.info('Adding air quality sensors for %s ', device.info.name)
		let name
		if (type=='in') {
			name=' Indoor Air Quality'
		}
		else{
			name=' Outdoor Air Quality'
		}
		let sensor=weatherStation.getServiceById(Service.AirQualitySensor, type)
		if(!sensor){
			sensor = new Service.AirQualitySensor('air', type)
			sensor.addCharacteristic(Characteristic.ConfiguredName)
			sensor.setCharacteristic(Characteristic.ConfiguredName, device.info.name+name)
			weatherStation.addService(sensor)

			let aqi=Characteristic.AirQuality.UNKNOWN
			if(device.lastData.aqi_pm25_aqin >300) {aqi=Characteristic.AirQuality.POOR}
			else if(device.lastData.aqi_pm25_aqin >200) {aqi=Characteristic.AirQuality.POOR}
			else if(device.lastData.aqi_pm25_aqin >150) {aqi=Characteristic.AirQuality.INFERIOR}
			else if(device.lastData.aqi_pm25_aqin >100) {aqi=Characteristic.AirQuality.FAIR}
			else if(device.lastData.aqi_pm25_aqin >50) {aqi=Characteristic.AirQuality.GOOD}
			else if(device.lastData.aqi_pm25_aqin >0) {aqi=Characteristic.AirQuality.EXCELLENT}

			sensor
				.setCharacteristic(Characteristic.Name, device.info.name+name)
				.setCharacteristic(Characteristic.StatusFault, Characteristic.StatusFault.NO_FAULT)
				.setCharacteristic(Characteristic.StatusLowBattery, Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL)
				.setCharacteristic(Characteristic.AirQuality, aqi)
				.setCharacteristic(Characteristic.PM2_5Density, device.lastData.pm25_in_aqin)

			sensor
				.getCharacteristic(Characteristic.AirQuality)
				.on('get', this.getStatus.bind(this, sensor))
		}
		return sensor
	}

	getStatus(sensorStatus, callback) {
		if (sensorStatus.getCharacteristic(Characteristic.StatusFault).value == Characteristic.StatusFault.GENERAL_FAULT) {
			callback('error')
		}
		else {
			let currentValue = sensorStatus.getCharacteristic(Characteristic.AirQuality).value
			callback(null, currentValue)
		}
	}
}
module.exports = sensor