import axios from "axios";
import React, { useContext, useState } from "react";
import { FaLock, FaSpinner, FaUser } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../AuthContext"; // Importa o contexto de autenticação
import "./Login.css";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useContext(AuthContext); // Obtém a função de login do contexto

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);

    try {
      const response = await axios.post("https://api-start-pira.vercel.app/api/login", { username, password });
      const { token, permissions, name, username: user } = response.data;

      login(token, permissions, name || user); // Chama a função de login do contexto com o nome
      navigate("/dashboard");
    } catch (error) {
      alert("Credenciais inválidas");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container">
      <form onSubmit={handleSubmit}>
        <h3>Login</h3>
        <div className="input-field">
          <label>Email</label>
          <input type="email" className="form-control" placeholder="Digite email" required onChange={(e) => setUsername(e.target.value)} />
          <FaUser className="icon" />
        </div>
        <div className="input-field">
          <label>Senha</label>
          <input type="password" className="form-control" placeholder="Digite a senha" onChange={(e) => setPassword(e.target.value)} />
          <FaLock className="icon" />
        </div>
        <div className="recall-forget">
          <input type="checkbox" className="custom-control-input" id="customCheck1" />
          <label className="custom-control-label" htmlFor="customCheck1">
            Lembrar senha
          </label>
        </div>

        <button type="submit" className="btn-primary-btn-block" disabled={isLoading}>
          {isLoading ? <FaSpinner className="loading-icon" /> : "Entrar"}
        </button>
      </form>

      <div className="forgot-password text-right">
        <p>
          <button type="button" className="link-button" onClick={() => navigate("/forgot-password")}>
            Esqueceu sua senha?
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login;
