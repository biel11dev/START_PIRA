import React, { useContext, useState } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import Acessos from "./Acessos";
import "./App.css";
import { AuthContext } from "./AuthContext"; // Importa o contexto de autenticação
import BaseProduto from "./BaseProduto";
import CashRegister from "./CashRegister";
import ClientDetails from "./ClientDetails";
import Login from "./Components/Login/Login";
import Register from "./Components/Register/Register";
import UserInfo from "./Components/UserInfo";
import Dashboard from "./Dashboard";
import Despesa from "./Despesa";
import Fiado from "./Fiado";
import ForgotPassword from "./ForgotPassword";
import Machines from "./Machine";
import MachineDetails from "./MachineDetails";
import PDV from "./PDV";
import Ponto from "./Ponto";
import ProductList from "./ProductList";
import ProtectedRoute from "./ProtectedRoute";
import ResetPassword from "./ResetPassword";
import Sidebar from "./SideBar";
import Pessoal from "./Pessoal";
function App() {
  const { auth } = useContext(AuthContext); // Obtém o estado de autenticação do contexto
  const [machines, setMachines] = useState([]);
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);

  const location = useLocation();

  // Verifique se a rota atual é "/", "/register" ou "/dashboard"
  const isLoginRegisterDashboard = ["/", "/dashboard"].includes(location.pathname);
  const isLoginRoute = location.pathname === "/";
  const isResetRoute = location.pathname.includes("/reset-password");
  const isForgotRoute = location.pathname.includes("/forgot-password");

  return (
    <div className={`App ${isLoginRegisterDashboard ? "background-login-register-dashboard" : "background-other"}`}>
      {isLoginRegisterDashboard && <h1 className="app-title">Start Pira</h1>} {/* Exibe o título apenas nas rotas especificadas */}
      {!isLoginRoute && !isResetRoute && !isForgotRoute && auth.isAuthenticated && <Sidebar permissions={auth.permissions} />}{" "}
      {!isLoginRoute && !isResetRoute && !isForgotRoute && auth.isAuthenticated && <UserInfo />}{" "}
      {/* Renderiza a Sidebar apenas se o usuário estiver autenticado */}
      <div className="content">
        <Routes>
          <Route path="/" element={<Login permissions={auth.permissions} />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard permissions={auth.permissions} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/products"
            element={
              <ProtectedRoute>
                <ProductList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/base-produto"
            element={
              <ProtectedRoute>
                <BaseProduto />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cash-register"
            element={
              <ProtectedRoute>
                <CashRegister />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pdv"
            element={
              <ProtectedRoute>
                <PDV />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pessoal"
            element={
              <ProtectedRoute>
                <Pessoal  />
              </ProtectedRoute>
            }
          />
          <Route
            path="/machines"
            element={
              <ProtectedRoute>
                <Machines machines={machines} setMachines={setMachines} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/machines/:id"
            element={
              <ProtectedRoute>
                <MachineDetails machines={machines} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/fiado"
            element={
              <ProtectedRoute>
                <Fiado clients={clients} setClients={setClients} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clients/:id"
            element={
              <ProtectedRoute>
                <ClientDetails clients={clients} setClients={setClients} products={products} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/despesas"
            element={
              <ProtectedRoute>
                <Despesa />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ponto"
            element={
              <ProtectedRoute>
                <Ponto />
              </ProtectedRoute>
            }
          />
          <Route
            path="/acessos"
            element={
              <ProtectedRoute>
                <Acessos />
              </ProtectedRoute>
            }
          />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
