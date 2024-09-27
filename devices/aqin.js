
class aqin {
	constructor(platform, log) {
		this.log = log
		this.platform = platform
	}

	createAccessory(device, uuid, aqinSensor) {
		if(!aqinSensor){
			this.log.info('Adding air quality sensor for %s', device.info.name)
			aqinSensor = new PlatformAccessory(device.info.name, uuid)
		}
		else{
			this.log.debug('update Accessory %s AQIN', device.info.name)
		}
		aqinSensor.getService(Service.AccessoryInformation)
			.setCharacteristic(Characteristic.Name, device.info.name)
			.setCharacteristic(Characteristic.Manufacturer, "Ambient")
			.setCharacteristic(Characteristic.SerialNumber, device.macAddress)
			.setCharacteristic(Characteristic.Model, "WS45")

		let name ='Indoor Air Quality'
		let tempSensor=aqinSensor.getService(Service.TemperatureSensor)
		if(!tempSensor){
			tempSensor = new Service.TemperatureSensor(name)
			aqinSensor.addService(tempSensor)
			tempSensor.addCharacteristic(Characteristic.ConfiguredName)
			tempSensor.setCharacteristic(Characteristic.ConfiguredName, device.info.name+' '+name)
			tempSensor
				.getCharacteristic(Characteristic.CurrentTemperature)
				.on('get', this.getStatusTemp.bind(this, tempSensor))
			}
			tempSensor
				.setCharacteristic(Characteristic.Name, device.info.name+' '+name)
				.setCharacteristic(Characteristic.StatusFault, Characteristic.StatusFault.NO_FAULT)
				.setCharacteristic(Characteristic.StatusLowBattery, Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL)
				.setCharacteristic(Characteristic.CurrentTemperature, ((device.lastData.pm_in_temp_aqin- 32 + .01) * 5 / 9).toFixed(1))

		let humSensor=aqinSensor.getService(Service.HumiditySensor)
		if(!humSensor){
			humSensor = new Service.HumiditySensor(name)
			aqinSensor.addService(humSensor)
			humSensor.addCharacteristic(Characteristic.ConfiguredName)
			humSensor.setCharacteristic(Characteristic.ConfiguredName, device.info.name+' '+name)
			humSensor
				.getCharacteristic(Characteristic.CurrentRelativeHumidity)
				.on('get', this.getStatusHum.bind(this, humSensor))
		}

			humSensor
				.setCharacteristic(Characteristic.Name, device.info.name+' '+name)
				.setCharacteristic(Characteristic.StatusFault, Characteristic.StatusFault.NO_FAULT)
				.setCharacteristic(Characteristic.StatusLowBattery, Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL)
				.setCharacteristic(Characteristic.CurrentRelativeHumidity, device.lastData.pm_in_humidity_aqin)

		let airSensor=aqinSensor.getService(Service.AirQualitySensor)
		if(!airSensor){
			airSensor = new Service.AirQualitySensor(name)
			aqinSensor.addService(airSensor)
			airSensor.addCharacteristic(Characteristic.ConfiguredName)
			airSensor.setCharacteristic(Characteristic.ConfiguredName, device.info.name+' '+name)
			airSensor
			.getCharacteristic(Characteristic.AirQuality)
			.on('get', this.getStatusAir.bind(this, airSensor))
		}

			let aqi=Characteristic.AirQuality.UNKNOWN
			if(device.lastData.aqi_pm25_aqin >300) {aqi=Characteristic.AirQuality.POOR}
			else if(device.lastData.aqi_pm25_aqin >200) {aqi=Characteristic.AirQuality.POOR}
			else if(device.lastData.aqi_pm25_aqin >150) {aqi=Characteristic.AirQuality.INFERIOR}
			else if(device.lastData.aqi_pm25_aqin >100) {aqi=Characteristic.AirQuality.FAIR}
			else if(device.lastData.aqi_pm25_aqin >50) {aqi=Characteristic.AirQuality.GOOD}
			else if(device.lastData.aqi_pm25_aqin >0) {aqi=Characteristic.AirQuality.EXCELLENT}

			airSensor
				.setCharacteristic(Characteristic.Name, device.info.name+' '+name)
				.setCharacteristic(Characteristic.StatusFault, Characteristic.StatusFault.NO_FAULT)
				.setCharacteristic(Characteristic.StatusLowBattery, Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL)
				.setCharacteristic(Characteristic.AirQuality, aqi)
				.setCharacteristic(Characteristic.PM10Density, device.lastData.pm10_in_aqin)
				.setCharacteristic(Characteristic.PM2_5Density, device.lastData.pm25_in_aqin)


			let co2Sensor=aqinSensor.getService(Service.CarbonDioxideSensor)
			if(!co2Sensor){
				co2Sensor = new Service.CarbonDioxideSensor(name)
				aqinSensor.addService(co2Sensor)
				co2Sensor.addCharacteristic(Characteristic.ConfiguredName)
				co2Sensor.setCharacteristic(Characteristic.ConfiguredName, device.info.name+' '+name)
				co2Sensor
				.getCharacteristic(Characteristic.CarbonDioxideDetected)
				.on('get', this.getStatusCo2.bind(this, co2Sensor))
			}

			let co2
			if(device.lastData.co2_in_aqin > 1200){
				co2=Characteristic.CarbonDioxideDetected.CO2_LEVELS_ABNORMAL
			}
			else{
				co2=Characteristic.CarbonDioxideDetected.CO2_LEVELS_NORMAL
			}

			co2Sensor
				.setCharacteristic(Characteristic.Name, device.info.name+' '+name)
				.setCharacteristic(Characteristic.StatusFault, Characteristic.StatusFault.NO_FAULT)
				.setCharacteristic(Characteristic.StatusLowBattery, Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW)
				.setCharacteristic(Characteristic.CarbonDioxideDetected, co2)
				.setCharacteristic(Characteristic.CarbonDioxideLevel, device.lastData.co2_in_aqin)
				.setCharacteristic(Characteristic.CarbonDioxidePeakLevel, device.lastData.co2_in_24h_aqin)

		let batteryStatus=aqinSensor.getService(Service.Battery)
		if(!batteryStatus){
			batteryStatus = new Service.Battery(name)
			aqinSensor.addService(batteryStatus)

			batteryStatus
				.getCharacteristic(Characteristic.StatusLowBattery)
				.on('get', this.getStatusLowBattery.bind(this, batteryStatus))
		}
			batteryStatus
				.setCharacteristic(Characteristic.Name, device.info.name+' '+name)
				.setCharacteristic(Characteristic.StatusLowBattery, !device.lastData.batt_co2)

		return aqinSensor
	}

	getStatusTemp(sensorStatus, callback) {
		if (sensorStatus.getCharacteristic(Characteristic.StatusFault).value == Characteristic.StatusFault.GENERAL_FAULT) {
			callback('error')
		}
		else {
			let currentValue = sensorStatus.getCharacteristic(Characteristic.CurrentTemperature).value
			callback(null, currentValue)
		}
	}

	getStatusHum(sensorStatus, callback) {
		if (sensorStatus.getCharacteristic(Characteristic.StatusFault).value == Characteristic.StatusFault.GENERAL_FAULT) {
			callback('error')
		}
		else {
			let currentValue = sensorStatus.getCharacteristic(Characteristic.CurrentRelativeHumidity).value
			callback(null, currentValue)
		}
	}

	getStatusAir(sensorStatus, callback) {
		if (sensorStatus.getCharacteristic(Characteristic.StatusFault).value == Characteristic.StatusFault.GENERAL_FAULT) {
			callback('error')
		}
		else {
			let currentValue = sensorStatus.getCharacteristic(Characteristic.AirQuality).value
			callback(null, currentValue)
		}
	}

	getStatusCo2(sensorStatus, callback) {
		if (sensorStatus.getCharacteristic(Characteristic.StatusFault).value == Characteristic.StatusFault.GENERAL_FAULT) {
			callback('error')
		}
		else {
			let currentValue = sensorStatus.getCharacteristic(Characteristic.CarbonDioxideDetected).value
			callback(null, currentValue)
		}
	}

	getStatusLowBattery(batteryStatus, callback) {
		try{
			let currentValue = batteryStatus.getCharacteristic(Characteristic.StatusLowBattery).value
			if (currentValue==1) {
				this.log.warn('Battery Status Low')
			}
			callback(null, currentValue)
		}catch (error) {
			this.log.error("caught low battery error")
			return
		}
	}
}
module.exports = aqin