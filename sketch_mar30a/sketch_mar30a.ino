#include <Wire.h>
#include "MAX30100_PulseOximeter.h"
#include <DHT.h>

#define DHTPIN 2
#define DHTTYPE DHT11

DHT dht(DHTPIN, DHTTYPE);
PulseOximeter pox;

bool startReading = false;

void setup() {
  Serial.begin(9600);
  dht.begin();
  pox.begin();
}

void loop() {

  // Check command from PC
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');

    if (cmd == "START") {
      startReading = true;
    }
  }

  if (startReading) {
    startReading = false;

    long startTime = millis();

    float tempSum = 0, humSum = 0, spo2Sum = 0, bpmSum = 0;
    int count = 0;

    while (millis() - startTime < 5000) {  // 5 sec
      pox.update();

      float temp = dht.readTemperature();
      float spo2 = pox.getSpO2();
      float bpm = pox.getHeartRate();

      if (spo2 > 0 && bpm > 0) {
        tempSum += temp;
        spo2Sum += spo2;
        bpmSum += bpm;
        count++;
      }

      delay(200);
    }

    // Calculate average
    float avgTemp = tempSum / count;
    float avgSpo2 = spo2Sum / count;
    float avgBpm = bpmSum / count;

    // Send to PC
    Serial.print("RESULT:");
    Serial.print(avgTemp); Serial.print(",");
    Serial.print(avgSpo2); Serial.print(",");
    Serial.println(avgBpm);
  }
}