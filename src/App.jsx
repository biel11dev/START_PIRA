import React, { useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import "./App.css";
import CashRegister from "./CashRegister";
import ClientDetails from "./ClientDetails";
import Login from "./Components/Login/Login";
import Register from "./Components/Register/Register"; // Importe o componente Register
import Dashboard from "./Dashboard";
import Despesa from "./Despesa";
import Fiado from "./Fiado";
import Machines from "./Machine";
import MachineDetails from "./MachineDetails";
import ProductList from "./ProductList";
import Sidebar from "./SideBar";

function App() {
  const [machines, setMachines] = useState([]);
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false); // Estado de autenticação

  return (
    <div className="App">
      <h1 className="app-title">Start Pira</h1>
      {isAuthenticated && <Sidebar />} {/* Renderiza a Sidebar apenas se autenticado */}
      <div className="content">
        <Routes>
          <Route path="/" element={<Login setIsAuthenticated={setIsAuthenticated} />} /> {/* Passa o setter para o Login */}
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={isAuthenticated ? <Dashboard /> : <Navigate to="/" />} />
          <Route path="/products" element={<ProductList />} />
          <Route path="/cash-register" element={<CashRegister />} />
          <Route path="/machines" element={<Machines machines={machines} setMachines={setMachines} />} />
          <Route path="/machines/:id" element={<MachineDetails machines={machines} />} />
          <Route path="/fiado" element={<Fiado clients={clients} setClients={setClients} />} />
          <Route path="/clients/:id" element={<ClientDetails clients={clients} setClients={setClients} products={products} />} />
          <Route path="/despesas" element={<Despesa />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
