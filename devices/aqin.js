export default class aqin {
	constructor(platform, log, api) {
		this.log = log
		this.platform = platform
		this.api = api
	}

	createAccessory(device, uuid, aqinSensor) {
		if(!aqinSensor){
			this.log.info('Adding air quality sensor for %s', device.info.name)
			aqinSensor = new this.api.platformAccessory(device.info.name, uuid)
		}
		else{
			this.log.debug('update Accessory %s AQIN', device.info.name)
		}
		aqinSensor.getService(this.api.hap.Service.AccessoryInformation)
			.setCharacteristic(this.api.hap.Characteristic.Name, device.info.name)
			.setCharacteristic(this.api.hap.Characteristic.Manufacturer, this.platform.manufacturer)
			.setCharacteristic(this.api.hap.Characteristic.SerialNumber, device.macAddress)
			.setCharacteristic(this.api.hap.Characteristic.Model, "WS45")

		let name ='Indoor Air Quality'
		let tempSensor=aqinSensor.getService(this.api.hap.Service.TemperatureSensor)
		if(!tempSensor){
			tempSensor = new this.api.hap.Service.TemperatureSensor(name)
			aqinSensor.addService(tempSensor)
			tempSensor.addCharacteristic(this.api.hap.Characteristic.ConfiguredName)
			tempSensor.setCharacteristic(this.api.hap.Characteristic.ConfiguredName, device.info.name+' '+name)
			tempSensor
				.getCharacteristic(this.api.hap.Characteristic.CurrentTemperature)
				.on('get', this.getStatusTemp.bind(this, tempSensor))
			}
			tempSensor
				.setCharacteristic(this.api.hap.Characteristic.Name, device.info.name+' '+name)
				.setCharacteristic(this.api.hap.Characteristic.StatusFault, this.api.hap.Characteristic.StatusFault.NO_FAULT)
				.setCharacteristic(this.api.hap.Characteristic.StatusLowBattery, this.api.hap.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL)
				.setCharacteristic(this.api.hap.Characteristic.CurrentTemperature, ((device.lastData.pm_in_temp_aqin- 32 + .01) * 5 / 9).toFixed(1))

		let humSensor=aqinSensor.getService(this.api.hap.Service.HumiditySensor)
		if(!humSensor){
			humSensor = new this.api.hap.Service.HumiditySensor(name)
			aqinSensor.addService(humSensor)
			humSensor.addCharacteristic(this.api.hap.Characteristic.ConfiguredName)
			humSensor.setCharacteristic(this.api.hap.Characteristic.ConfiguredName, device.info.name+' '+name)
			humSensor
				.getCharacteristic(this.api.hap.Characteristic.CurrentRelativeHumidity)
				.on('get', this.getStatusHum.bind(this, humSensor))
		}

			humSensor
				.setCharacteristic(this.api.hap.Characteristic.Name, device.info.name+' '+name)
				.setCharacteristic(this.api.hap.Characteristic.StatusFault, this.api.hap.Characteristic.StatusFault.NO_FAULT)
				.setCharacteristic(this.api.hap.Characteristic.StatusLowBattery, this.api.hap.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL)
				.setCharacteristic(this.api.hap.Characteristic.CurrentRelativeHumidity, device.lastData.pm_in_humidity_aqin)

		let airSensor=aqinSensor.getService(this.api.hap.Service.AirQualitySensor)
		if(!airSensor){
			airSensor = new this.api.hap.Service.AirQualitySensor(name)
			aqinSensor.addService(airSensor)
			airSensor.addCharacteristic(this.api.hap.Characteristic.ConfiguredName)
			airSensor.setCharacteristic(this.api.hap.Characteristic.ConfiguredName, device.info.name+' '+name)
			airSensor
			.getCharacteristic(this.api.hap.Characteristic.AirQuality)
			.on('get', this.getStatusAir.bind(this, airSensor))
		}

			let aqi=this.api.hap.Characteristic.AirQuality.UNKNOWN
			if(device.lastData.aqi_pm25_aqin >300) {aqi=this.api.hap.Characteristic.AirQuality.POOR}
			else if(device.lastData.aqi_pm25_aqin >200) {aqi=this.api.hap.Characteristic.AirQuality.POOR}
			else if(device.lastData.aqi_pm25_aqin >150) {aqi=this.api.hap.Characteristic.AirQuality.INFERIOR}
			else if(device.lastData.aqi_pm25_aqin >100) {aqi=this.api.hap.Characteristic.AirQuality.FAIR}
			else if(device.lastData.aqi_pm25_aqin >50) {aqi=this.api.hap.Characteristic.AirQuality.GOOD}
			else if(device.lastData.aqi_pm25_aqin >0) {aqi=this.api.hap.Characteristic.AirQuality.EXCELLENT}

			airSensor
				.setCharacteristic(this.api.hap.Characteristic.Name, device.info.name+' '+name)
				.setCharacteristic(this.api.hap.Characteristic.StatusFault, this.api.hap.Characteristic.StatusFault.NO_FAULT)
				.setCharacteristic(this.api.hap.Characteristic.StatusLowBattery, this.api.hap.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL)
				.setCharacteristic(this.api.hap.Characteristic.AirQuality, aqi)
				.setCharacteristic(this.api.hap.Characteristic.PM10Density, device.lastData.pm10_in_aqin)
				.setCharacteristic(this.api.hap.Characteristic.PM2_5Density, device.lastData.pm25_in_aqin)


			let co2Sensor=aqinSensor.getService(this.api.hap.Service.CarbonDioxideSensor)
			if(!co2Sensor){
				co2Sensor = new this.api.hap.Service.CarbonDioxideSensor(name)
				aqinSensor.addService(co2Sensor)
				co2Sensor.addCharacteristic(this.api.hap.Characteristic.ConfiguredName)
				co2Sensor.setCharacteristic(this.api.hap.Characteristic.ConfiguredName, device.info.name+' '+name)
				co2Sensor
				.getCharacteristic(this.api.hap.Characteristic.CarbonDioxideDetected)
				.on('get', this.getStatusCo2.bind(this, co2Sensor))
			}

			let co2
			if(device.lastData.co2_in_aqin > 1200){
				co2=this.api.hap.Characteristic.CarbonDioxideDetected.CO2_LEVELS_ABNORMAL
			}
			else{
				co2=this.api.hap.Characteristic.CarbonDioxideDetected.CO2_LEVELS_NORMAL
			}

			co2Sensor
				.setCharacteristic(this.api.hap.Characteristic.Name, device.info.name+' '+name)
				.setCharacteristic(this.api.hap.Characteristic.StatusFault, this.api.hap.Characteristic.StatusFault.NO_FAULT)
				.setCharacteristic(this.api.hap.Characteristic.StatusLowBattery, this.api.hap.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW)
				.setCharacteristic(this.api.hap.Characteristic.CarbonDioxideDetected, co2)
				.setCharacteristic(this.api.hap.Characteristic.CarbonDioxideLevel, device.lastData.co2_in_aqin)
				.setCharacteristic(this.api.hap.Characteristic.CarbonDioxidePeakLevel, device.lastData.co2_in_24h_aqin)

		let batteryStatus=aqinSensor.getService(this.api.hap.Service.Battery)
		if(!batteryStatus){
			batteryStatus = new this.api.hap.Service.Battery(name)
			aqinSensor.addService(batteryStatus)

			batteryStatus
				.getCharacteristic(this.api.hap.Characteristic.StatusLowBattery)
				.on('get', this.getStatusLowBattery.bind(this, batteryStatus))
		}
			batteryStatus
				.setCharacteristic(this.api.hap.Characteristic.Name, device.info.name+' '+name)
				.setCharacteristic(this.api.hap.Characteristic.StatusLowBattery, !device.lastData.batt_co2)

		return aqinSensor
	}

	getStatusTemp(sensorStatus, callback) {
		if (sensorStatus.getCharacteristic(this.api.hap.Characteristic.StatusFault).value == this.api.hap.Characteristic.StatusFault.GENERAL_FAULT) {
			callback('error')
		}
		else {
			let currentValue = sensorStatus.getCharacteristic(this.api.hap.Characteristic.CurrentTemperature).value
			callback(null, currentValue)
		}
	}

	getStatusHum(sensorStatus, callback) {
		if (sensorStatus.getCharacteristic(this.api.hap.Characteristic.StatusFault).value == this.api.hap.Characteristic.StatusFault.GENERAL_FAULT) {
			callback('error')
		}
		else {
			let currentValue = sensorStatus.getCharacteristic(this.api.hap.Characteristic.CurrentRelativeHumidity).value
			callback(null, currentValue)
		}
	}

	getStatusAir(sensorStatus, callback) {
		if (sensorStatus.getCharacteristic(this.api.hap.Characteristic.StatusFault).value == this.api.hap.Characteristic.StatusFault.GENERAL_FAULT) {
			callback('error')
		}
		else {
			let currentValue = sensorStatus.getCharacteristic(this.api.hap.Characteristic.AirQuality).value
			callback(null, currentValue)
		}
	}

	getStatusCo2(sensorStatus, callback) {
		if (sensorStatus.getCharacteristic(this.api.hap.Characteristic.StatusFault).value == this.api.hap.Characteristic.StatusFault.GENERAL_FAULT) {
			callback('error')
		}
		else {
			let currentValue = sensorStatus.getCharacteristic(this.api.hap.Characteristic.CarbonDioxideDetected).value
			callback(null, currentValue)
		}
	}

	getStatusLowBattery(batteryStatus, callback) {
		try{
			let currentValue = batteryStatus.getCharacteristic(this.api.hap.Characteristic.StatusLowBattery).value
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