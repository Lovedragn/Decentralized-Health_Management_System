#include <Wire.h>
#include "MAX30105.h"
#include "heartRate.h"
#include "DHT.h"

#define DHTPIN 2
#define DHTTYPE DHT11
DHT dht(DHTPIN, DHTTYPE);

MAX30105 particleSensor;

long lastBeat = 0;
float beatAvg = 0;
unsigned long lastDHTUpdate = 0;
bool startReading = false;

// 🔥 Global variables
float temp = 0;
float spo2 = 0;
float heartRate = 0;

void setup() {
  Serial.begin(9600);
  Wire.begin();

  dht.begin();

  if (!particleSensor.begin(Wire, I2C_SPEED_FAST)) {
    Serial.println("ERROR");
    while (1)
      ;
  }

  particleSensor.setup();
  particleSensor.setPulseAmplitudeRed(0x0A);
  particleSensor.setPulseAmplitudeIR(0x1F);
}

void loop() {
  // Check command from PC
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    if (cmd == "START") {
      startReading = true;
    }
  }

  if (startReading) {
    startReading = false;

    unsigned long startTime = millis();

    float tempSum = 0, spo2Sum = 0, bpmSum = 0;
    int count = 0;

    while (millis() - startTime < 10000) {  // collect for 10 sec
      long irValue = particleSensor.getIR();

      // Beat detection
      if (checkForBeat(irValue)) {
        long delta = millis() - lastBeat;
        lastBeat = millis();

        if (delta > 300 && delta < 1500) {
          heartRate = 60.0 / (delta / 1000.0);
          if (beatAvg == 0) beatAvg = heartRate;
          else beatAvg = (beatAvg * 0.7) + (heartRate * 0.3);
        }
      }

      // DHT read every 2 sec
      if (millis() - lastDHTUpdate > 2000) {
        lastDHTUpdate = millis();

        if (irValue > 50000) {
          temp = dht.readTemperature();
          spo2 = map(constrain(irValue, 50000, 100000), 50000, 100000, 95, 100);

          // ✅ Only accumulate valid heart rate values
          if (!isnan(temp) && beatAvg > 0 && spo2 > 0) {
            tempSum += temp;
            spo2Sum += spo2;
            bpmSum += beatAvg;
            count++;
          }
        }
      }

      delay(20);
    }

    // Calculate averages only if valid samples exist
    if (count > 0) {
      float avgTemp = tempSum / count;
      float avgSpo2 = spo2Sum / count;
      float avgBpm = bpmSum / count;

      Serial.print("RESULT:");
      Serial.print(avgTemp+3.5);
      Serial.print(",");
      Serial.print(avgBpm);
      Serial.print(",");
      Serial.println(avgSpo2);
    } else {
      Serial.println("RESULT: No valid heart rate detected");
    }
  }
}