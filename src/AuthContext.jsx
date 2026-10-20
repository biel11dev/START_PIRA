import axios from "axios";
import React, { createContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState({
    isAuthenticated: false,
    token: null,
    userName: null,
    permissions: { caixa: false, produtos: false, maquinas: false, fiado: false, despesas: false, ponto: false, acessos: false, base_produto: false, pdv: false, pessoal: false, auditoria: false },
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const validateToken = async () => {
      const token = localStorage.getItem("authToken");
      const userName = localStorage.getItem("userName");
      const storedPermissions = JSON.parse(localStorage.getItem("permissions")) || {
        // Recupera as permissões do localStorage
        caixa: false,
        produtos: false,
        maquinas: false,
        fiado: false,
        despesas: false,
        ponto: false,
        acessos: false,
        base_produto: false,
        pdv: false,
        pessoal: false,
        auditoria: false
      };
      if (token) {
        try {
          const response = await axios.post("https://api-start-pira.vercel.app/api/validate-token", { token });
          setAuth({ isAuthenticated: true, token, userName, permissions: storedPermissions });
        } catch (error) {
          console.error("Token inválido ou expirado:", error);
          localStorage.removeItem("authToken");
          localStorage.removeItem("userName");
          localStorage.removeItem("permissions");
          setAuth({ isAuthenticated: false, user: null, token: null, userName: null });
          navigate("/");
        }
      }
      setLoading(false);
    };

    validateToken();
  }, [navigate]);

  const login = (token, permissions, userName) => {
    localStorage.setItem("authToken", token);
    localStorage.setItem("userName", userName);
    localStorage.setItem("permissions", JSON.stringify(permissions)); // Armazena as permissões no localStorage
    setAuth({ isAuthenticated: true, token, userName, permissions });
  };

  const logout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userName");
    localStorage.removeItem("permissions");
    setAuth({
      isAuthenticated: false,
      user: null,
      token: null,
      userName: null,
      permissions: {
        caixa: false,
        produtos: false,
        maquinas: false,
        fiado: false,
        despesas: false,
        ponto: false,
        acessos: false,
        base_produto: false,
        pdv: false,
        pessoal: false,
        auditoria: false
      },
    });
    navigate("/");
  };

  // Registra o logout no servidor; com ponto automático habilitado pede confirmação do horário de saída.
  const requestLogout = async () => {
    const headers = { Authorization: `Bearer ${auth.token}` };
    let status = null;
    try {
      const res = await axios.get("https://api-start-pira.vercel.app/api/ponto-auto/status", { headers, timeout: 8000 });
      status = res.data;
    } catch (error) {
      console.warn("Falha ao consultar ponto automático:", error.message);
    }

    if (status?.autoPonto) {
      const confirmou = window.confirm(
        `Você está saindo às ${status.exitTime}. Confirmar?\nEsse horário será registrado como sua saída no ponto.`
      );
      if (!confirmou) return;
    }

    try {
      await axios.post("https://api-start-pira.vercel.app/api/logout", null, { headers, timeout: 8000 });
    } catch (error) {
      console.warn("Falha ao registrar logout no servidor:", error.message);
    }
    logout();
  };

  return <AuthContext.Provider value={{ auth, login, logout, requestLogout, loading }}>{!loading && children}</AuthContext.Provider>;
};
