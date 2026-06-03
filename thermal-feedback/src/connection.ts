export const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

// export const MQTT_BROKER_URL = "ws://192.168.1.214:9001"; // WebSocket URL for MQTT broker
export const MQTT_BROKER_URL = "ws://193.205.185.56:7080"; // WebSocket URL for MQTT broker
// export const MQTT_USERNAME = "user";
// export const MQTT_PASSWORD = "password";
export const MQTT_TOPICS = {
  commands: "/commands/", // App publishes here → device receives
  values: "/values/", // Device publishes here → app receives
};
