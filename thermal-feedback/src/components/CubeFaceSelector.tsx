import { useState } from "react";
import type { Handedness } from "../types";
import TemperatureEstimateWidget from "./TemperatureEstimateWidget";

const SELECTED_FILL = "#e8956d";
const SELECTED_STROKE = "#c05a32";
const HOVER_FILL = "#e2e2e2";
const NORMAL_STROKE = "#888";

const getFaceConfigs = (handedness: Handedness) =>
  [
    {
      index: 1 as const,
      label: "Indice",
      points: "90,15 155,52 90,88 25,52",
      cx: 90,
      cy: 52,
      baseColor: "#d0d0d0",
    },
    {
      index: 0 as const,
      label: handedness === "Destra" ? "Pollice" : "Medio",
      points: "25,52 90,88 90,143 25,107",
      cx: 57,
      cy: 98,
      baseColor: "#bebebe",
    },
    {
      index: 2 as const,
      label: handedness === "Destra" ? "Medio" : "Pollice",
      points: "90,88 155,52 155,107 90,143",
      cx: 123,
      cy: 98,
      baseColor: "#acacac",
    },
  ] as const;

interface Props {
  mode: "single" | "multi";
  selected: number[];
  onChange: (faces: number[]) => void;
  onChangeTempFaces: (tempFaces: number[]) => void;
  handedness: Handedness;
}

export const CubeFaceSelector = ({
  mode,
  selected,
  onChange,
  onChangeTempFaces,
  handedness,
}: Props) => {
  const FACE_CONFIGS = getFaceConfigs(handedness);
  const [hovered, setHovered] = useState<number | null>(null);
  const [tempFace, setTempFace] = useState(Array(3).fill(0));

  const handleClick = (faceIndex: number) => {
    switch (faceIndex) {
      case 0:
        setTempFace((prev) => {
          const newTempFace = [...prev];
          newTempFace[0] = newTempFace[0] < 5 ? newTempFace[0] + 1 : 0;
          onChangeTempFaces(newTempFace);
          return newTempFace;
        });
        break;
      case 1:
        setTempFace((prev) => {
          const newTempFace = [...prev];
          newTempFace[1] = newTempFace[1] < 5 ? newTempFace[1] + 1 : 0;
          onChangeTempFaces(newTempFace);
          return newTempFace;
        });
        break;
      case 2:
        setTempFace((prev) => {
          const newTempFace = [...prev];
          newTempFace[2] = newTempFace[2] < 5 ? newTempFace[2] + 1 : 0;
          onChangeTempFaces(newTempFace);
          return newTempFace;
        });
        break;
    }
    if (mode === "single") {
      if (selected.includes(faceIndex)) {
        if (tempFace[faceIndex] === 5) {
          onChange([]);
        }
      } else {
        onChange([faceIndex]);
      }
      // onChange(selected[0] === faceIndex ? [] : [faceIndex]);
    } else {
      if (selected.includes(faceIndex)) {
        if (tempFace[faceIndex] === 5) {
          onChange(selected.filter((f) => f !== faceIndex));
        }
      } else {
        onChange([...selected, faceIndex]);
      }
    }
  };

  return (
    <div className="flex flex-col justify-center items-center">
      <TemperatureEstimateWidget props={{ className: "" }} data={tempFace[1]} />
      <div className="flex justify-center my-4 gap-4">
        <TemperatureEstimateWidget props={{ className: "mt-22" }} data={tempFace[0]} />
        <svg
          viewBox="0 0 180 158"
          className="w-55 h-47.5"
          role="img"
          aria-label="Selettore facce del cubo"
        >
          {FACE_CONFIGS.map((face) => {
            const isSelected = selected.includes(face.index);
            const isHovered = hovered === face.index;
            const fill = isSelected ? SELECTED_FILL : isHovered ? HOVER_FILL : face.baseColor;
            const stroke = isSelected ? SELECTED_STROKE : NORMAL_STROKE;

            return (
              <g
                key={face.index}
                style={{ cursor: "pointer" }}
                onClick={() => handleClick(face.index)}
                onMouseEnter={() => setHovered(face.index)}
                onMouseLeave={() => setHovered(null)}
                aria-label={`Faccia ${face.label}`}
              >
                <polygon points={face.points} fill={fill} stroke={stroke} strokeWidth="1.5" />
                <text
                  x={face.cx}
                  y={face.cy}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="13"
                  fontWeight={isSelected ? "600" : "500"}
                  fill={isSelected ? "#fff" : "#333"}
                  style={{ pointerEvents: "none", userSelect: "none" }}
                >
                  {face.label}
                </text>
              </g>
            );
          })}
        </svg>
        <TemperatureEstimateWidget props={{ className: "mt-22" }} data={tempFace[2]} />
      </div>
    </div>
  );
};
