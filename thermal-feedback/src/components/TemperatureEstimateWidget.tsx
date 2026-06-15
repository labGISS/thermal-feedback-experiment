interface TemperatureEstimateWidgetProps {
  data: number;
  props?: React.HTMLAttributes<HTMLDivElement>;
}

const TemperatureEstimateWidget = ({ data, props }: TemperatureEstimateWidgetProps) => {
  return (
    <div
      className={`flex flex-col gap-1 ${data > 0 ? "opacity-100" : "opacity-0"} ${props?.className || ""}`}
    >
      <label className="text-gray-900 text-left text-sm">Quanto era caldo?</label>
      <div className={`flex flex-row items-center justify-center w-28 h-8 bg-gray-200 rounded`}>
        <div className="flex flex-row items-center justify-center gap-1">
          {Array.from({ length: data }, (_, i) => (
            <div
              key={i}
              className={`temperature-box w-4 h-4 rounded ${i < data ? "bg-red-400" : ""}`}
            ></div>
          ))}
          {Array.from({ length: 5 - data }, (_, i) => (
            <div key={i} className={`temperature-box w-4 h-4 rounded bg-gray-200}`}></div>
          ))}
        </div>
      </div>
      <div className="flex justify-between text-xs text-gray-400">
        <span>Poco</span>
        <span>Molto</span>
      </div>
    </div>
  );
};

export default TemperatureEstimateWidget;
