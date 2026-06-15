import { useEffect, useRef, useState } from "react";
import mqtt from "mqtt";
import type { MqttClient } from "mqtt";
import type { CommandMessage, FeedbackData, ValuesMessage } from "../types";
import { MQTT_BROKER_URL, MQTT_TOPICS } from "../connection";

// MQTT Configuration - Update these with your actual broker details
const MQTT_CONFIG = {
  broker: MQTT_BROKER_URL,
  options: {
    clientId: `thermal_feedback_client` + Math.random().toString(16).substr(2, 8), // Unique client ID
    clean: true,
    connectTimeout: 4000,
    // username: MQTT_USERNAME,
    // password: MQTT_PASSWORD,
  },
  topics: {
    commands: MQTT_TOPICS.commands, // App publishes here → device receives
    values: MQTT_TOPICS.values, // Device publishes here → app receives
  },
};

export const useMqtt = (onValuesReceived?: (values: ValuesMessage) => void) => {
  const [isConnected, setIsConnected] = useState(false);
  const clientRef = useRef<MqttClient | null>(null);
  const onValuesReceivedRef = useRef(onValuesReceived);

  // Keep ref in sync without triggering effect re-runs
  useEffect(() => {
    onValuesReceivedRef.current = onValuesReceived;
  }, [onValuesReceived]);

  useEffect(() => {
    let cancelled = false;

    const client = mqtt.connect(MQTT_CONFIG.broker, MQTT_CONFIG.options);
    clientRef.current = client;

    client.on("connect", () => {
      // If cleanup already ran (StrictMode double-invoke), bail out
      if (cancelled) {
        client.end();
        return;
      }
      console.log("MQTT connected");
      setIsConnected(true);

      // Subscribe to /values/ — device publishes here when a heating cycle ends
      client.subscribe(MQTT_CONFIG.topics.values, (err) => {
        if (err) {
          console.error("Failed to subscribe to /values/ topic:", err);
        }
      });
    });

    client.on("message", (topic, message) => {
      const raw = message.toString();
      console.log(`MQTT [${topic}]:`, raw);

      if (topic === MQTT_CONFIG.topics.values) {
        try {
          const values: ValuesMessage = JSON.parse(raw);
          onValuesReceivedRef.current?.(values);
        } catch {
          console.error("Failed to parse /values/ message:", raw);
        }
      }
    });

    client.on("error", (err) => {
      console.error("MQTT error:", err);
    });

    client.on("close", () => {
      if (cancelled) return;
      console.log("MQTT disconnected");
      setIsConnected(false);
    });

    return () => {
      cancelled = true;
      client.end();
    };
  }, []);

  const publishCommand = (command: CommandMessage) => {
    if (clientRef.current && isConnected) {
      const payload = JSON.stringify(command);
      clientRef.current.publish(MQTT_CONFIG.topics.commands, payload);
      console.log("Published command:", payload);
    }
  };

  const publishFeedback = (feedback: FeedbackData) => {
    if (clientRef.current && isConnected) {
      const payload = JSON.stringify(feedback);
      clientRef.current.publish(MQTT_TOPICS.feedback, payload);
      console.log("Published feedback:", payload);
    }
  };

  return {
    isConnected,
    publishCommand,
    publishFeedback,
  };
};
