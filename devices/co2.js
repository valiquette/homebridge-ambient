
class sensor {
	constructor(platform, log) {
		this.log = log
		this.platform = platform
	}

	createSensorService(weatherStation,device,type) {
		this.log.info('Adding co2 sensors for %s ', device.info.name)
		let name
		if (type=='in') {
			name=' Indoor CO2'
		}
		else{
			name=' Outdoor CO2'
		}
		let sensor=weatherStation.getServiceById(Service.CarbonDioxideSensor, type)
		if(!sensor){
			sensor = new Service.CarbonDioxideSensor('co2', type)
			sensor.addCharacteristic(Characteristic.ConfiguredName)
			sensor.setCharacteristic(Characteristic.ConfiguredName, device.info.name+name)
			weatherStation.addService(sensor)

			let co2
			if(device.lastData.co2_in_aqin > 1200){
				co2=Characteristic.CarbonDioxideDetected.CO2_LEVELS_ABNORMAL
			}
			else{
				co2=Characteristic.CarbonDioxideDetected.CO2_LEVELS_NORMAL
			}

			sensor
				.setCharacteristic(Characteristic.Name, device.info.name+name)
				.setCharacteristic(Characteristic.StatusFault, Characteristic.StatusFault.NO_FAULT)
				.setCharacteristic(Characteristic.StatusLowBattery, Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW)
				.setCharacteristic(Characteristic.CarbonDioxideDetected, co2)
				.setCharacteristic(Characteristic.CarbonDioxideLevel, device.lastData.co2_in_aqin)
				.setCharacteristic(Characteristic.CarbonDioxidePeakLevel, device.lastData.co2_in_24h_aqin)

			sensor
				.getCharacteristic(Characteristic.CarbonDioxideDetected)
				.on('get', this.getStatus.bind(this, sensor))
		}
		return sensor
	}

	getStatus(sensorStatus, callback) {
		if (sensorStatus.getCharacteristic(Characteristic.StatusFault).value == Characteristic.StatusFault.GENERAL_FAULT) {
			callback('error')
		}
		else {
			let currentValue = sensorStatus.getCharacteristic(Characteristic.CarbonDioxideDetected).value
			callback(null, currentValue)
		}
	}
}
module.exports = sensor