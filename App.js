import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  PanResponder,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width, height } = Dimensions.get("window");

export default function App() {
  const [carPosition, setCarPosition] = useState(width / 2 - 30);
  const [obstacles, setObstacles] = useState([]);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const [obstacleSpeed, setObstacleSpeed] = useState(6);

  const carY = height - 150;
  const carW = 60;
  const carH = 100;

  // swipe
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > 50) {
          setCarPosition((p) => Math.min(p + 60, width - carW));
        } else if (gesture.dx < -50) {
          setCarPosition((p) => Math.max(p - 60, 0));
        }
      },
    })
  ).current;

  useEffect(() => {
    loadHighScore();
  }, []);

  async function loadHighScore() {
    try {
      const saved = await AsyncStorage.getItem("car_game_highscore");
      if (saved !== null) setHighScore(Number(saved));
    } catch (e) {
      console.log("Error al cargar highscore", e);
    }
  }

  async function saveHighScore(newScore) {
    try {
      await AsyncStorage.setItem("car_game_highscore", String(newScore));
    } catch (e) {
      console.log("Error al guardar highscore", e);
    }
  }

  // loop: mover obstáculos
  useEffect(() => {
    if (gameOver) return;

    const interval = setInterval(() => {
      setObstacles((prev) => {
        const newObs = prev
          .map((o) => ({ ...o, y: o.y + obstacleSpeed }))
          .filter((o) => {
            if (o.y > height) {
              // salió → punto
              setScore((s) => {
                const newScore = s + 1;
                setObstacleSpeed((spd) => spd + 0.3); // más rápido
                if (newScore > highScore) {
                  setHighScore(newScore);
                  saveHighScore(newScore);
                }
                return newScore;
              });
              return false;
            }
            return true;
          });

        // 🚨 colisión
        const carBox = { x: carPosition, y: carY, w: carW, h: carH };
        for (const o of newObs) {
          const obstacleBox = { x: o.x, y: o.y, w: o.w, h: o.h };
          if (
            carBox.x < obstacleBox.x + obstacleBox.w &&
            carBox.x + carBox.w > obstacleBox.x &&
            carBox.y < obstacleBox.y + obstacleBox.h &&
            carBox.y + carBox.h > obstacleBox.y
          ) {
            setGameOver(true);
            return prev;
          }
        }

        return newObs;
      });
    }, 30);

    return () => clearInterval(interval);
  }, [gameOver, obstacleSpeed, carPosition]);

  // loop: spawner de obstáculos (fluido)
  useEffect(() => {
    if (gameOver) return;

    const spawner = setInterval(() => {
      // probabilidad de que aparezca un obstáculo (más alta con más puntos)
      const chance = Math.min(0.3 + score * 0.02, 0.8); // entre 30% y 80%
      if (Math.random() < chance) {
        const newObs = {
          x: Math.random() * (width - 80),
          y: 0,
          w: 40 + Math.random() * 60,
          h: 30 + Math.random() * 50,
        };
        setObstacles((prev) => [...prev, newObs]);
      }
    }, 400); // cada 400ms se decide si aparece uno

    return () => clearInterval(spawner);
  }, [gameOver, score]);

  function resetGame() {
    setCarPosition(width / 2 - carW / 2);
    setObstacles([]);
    setScore(0);
    setGameOver(false);
    setObstacleSpeed(6);
  }

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <Text style={styles.score}>🏆 Mejor: {highScore}</Text>
      <Text style={styles.score}>🎯 Puntos: {score}</Text>

      {!gameOver ? (
        <>
          <View style={styles.road} />

          <View
            style={[
              styles.car,
              { left: carPosition, top: carY, width: carW, height: carH },
            ]}
          />

          {obstacles.map((o, i) => (
            <View
              key={i}
              style={[
                styles.obstacle,
                { left: o.x, top: o.y, width: o.w, height: o.h },
              ]}
            />
          ))}
        </>
      ) : (
        <>
          <Text style={styles.gameOver}>💥 Game Over 💥</Text>
          <Text style={styles.score}>Toca para reiniciar</Text>
          <View
            style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }}
            onStartShouldSetResponder={() => {
              resetGame();
              return true;
            }}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#4d4d4d", alignItems: "center" },

  road: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: "70%",
    backgroundColor: "#666",
  },

  car: {
    backgroundColor: "#1976d2",
    position: "absolute",
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#fff",
  },

  obstacle: {
    backgroundColor: "#d32f2f",
    position: "absolute",
    borderRadius: 6,
  },

  score: { fontSize: 20, marginTop: 20, color: "white", fontWeight: "bold" },

  gameOver: {
    fontSize: 32,
    color: "yellow",
    marginTop: 200,
    fontWeight: "bold",
  },
});
