import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const DataContext = createContext(null);

export const DataProvider = ({ children }) => {
  const { user } = useAuth();
  
  const [games, setGames] = useState([]);
  const [players, setPlayers] = useState(["Aliff", "Bob", "Charlie", "Danish", "Ezra"]); // Mock data for now
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user && user.sheetId) {
      fetchData();
    } else {
      setGames([]);
    }
  }, [user]);

  const fetchData = async () => {
    if (!user?.sheetId) return;
    setLoading(true);
    setError(null);
    try {
      const GAS_URL = import.meta.env.VITE_GAS_WEB_APP_URL;
      
      if (!GAS_URL) {
        throw new Error("Sila masukkan VITE_GAS_WEB_APP_URL dalam fail .env");
      }

      const res = await fetch(`${GAS_URL}?action=getGames&sheetId=${encodeURIComponent(user.sheetId)}`);
      const result = await res.json();
      
      if (result.status === "success") {
        setGames(result.data);
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addGame = async (newGame) => {
    if (!user?.sheetId) return;
    try {
      const GAS_URL = import.meta.env.VITE_GAS_WEB_APP_URL;
      const res = await fetch(GAS_URL, {
        method: "POST",
        body: JSON.stringify({
          action: "addGame",
          sheetId: user.sheetId,
          data: newGame
        }),
        // Penting untuk Apps Script CORS
        redirect: "follow",
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        }
      });
      const result = await res.json();
      if (result.status === "success") {
        fetchData(); // Refresh data lepas tambah
      } else {
        alert("Gagal tambah game: " + result.message);
      }
    } catch (err) {
      console.error(err);
      alert("Error: " + err.message);
    }
  };

  const updateGame = async (gameNum, updatedGame) => {
    if (!user?.sheetId) return;
    try {
      const GAS_URL = import.meta.env.VITE_GAS_WEB_APP_URL;
      const res = await fetch(GAS_URL, {
        method: "POST",
        body: JSON.stringify({
          action: "updateGame",
          sheetId: user.sheetId,
          gameNum: gameNum,
          data: updatedGame
        }),
        redirect: "follow",
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        }
      });
      const result = await res.json();
      if (result.status === "success") {
        fetchData(); // Refresh data lepas update
      } else {
        alert("Gagal update game: " + result.message);
      }
    } catch (err) {
      console.error(err);
      alert("Error: " + err.message);
    }
  };

  const deleteGame = async (num) => {
    setGames(prev => prev.filter(g => g.num !== num));
  };

  const addPlayer = async (name) => {
    if (!players.includes(name)) {
      setPlayers(prev => [...prev, name]);
    }
  };

  return (
    <DataContext.Provider value={{ games, players, loading, error, addGame, updateGame, deleteGame, addPlayer, refreshData: fetchData }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => useContext(DataContext);
