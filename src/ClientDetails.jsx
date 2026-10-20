import axios from "axios";
import React, { useEffect, useState } from "react";
import { FaSpinner } from "react-icons/fa";
import { useParams } from "react-router-dom";
import "./ClientDetails.css";
import Message from "./Message";

const ClientDetails = ({ clients, setClients }) => {
  const { id } = useParams();
  const [client, setClient] = useState(null);
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [quantity, setQuantity] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().substr(0, 10));
  const [editingPurchase, setEditingPurchase] = useState(null);
  const [editingPayment, setEditingPayment] = useState(null);
  const [editingPurchaseData, setEditingPurchaseData] = useState({});
  const [editingPaymentData, setEditingPaymentData] = useState({});
  const [message, setMessage] = useState(null);
  const [loadingAddPurchase, setLoadingAddPurchase] = useState(false); // Estado de carregamento para adicionar compra
  const [loadingPaidAmount, setLoadingPaidAmount] = useState(false); // Estado de carregamento para registrar pagamento

  const fetchClientDetails = () => {
    axios
      .get(`https://api-start-pira.vercel.app/api/clients/${id}`)
      .then((response) => {
        const clientData = response.data;
        // Inicializar purchases e payments como arrays vazios se não estiverem definidos
        clientData.purchases = clientData.Purchase || [];
        clientData.payments = clientData.Payment || [];
        setClient(clientData);
      })
      .catch((error) => {
        console.error("Erro ao buscar detalhes do cliente:", error);
      });
  };

  useEffect(() => {
    fetchClientDetails();

    // Buscar produtos da API quando o componente for montado
    axios
      .get("https://api-start-pira.vercel.app/api/products")
      .then((response) => {
        setProducts(response.data);
      })
      .catch((error) => {
        console.error("Erro ao buscar produtos:", error);
      });
  }, [id]);

  const handleAddPurchase = () => {
    if (selectedProduct && quantity) {
      setLoadingAddPurchase(true); // Ativa o estado de carregamento
      const product = products.find((p) => p.name === selectedProduct);
      const total = product.value * parseInt(quantity, 10); // Converter quantity para inteiro
      axios
        .post("https://api-start-pira.vercel.app/api/purchases", { product: selectedProduct, quantity, total, date: purchaseDate, clientId: client.id })
        .then((response) => {
          const updatedTotalDebt = client.totalDebt + total;
          axios
            .put(`https://api-start-pira.vercel.app/api/clients/${client.id}`, { totalDebt: updatedTotalDebt })
            .then(() => {
              fetchClientDetails(); // Recarregar os detalhes do cliente após adicionar a compra
              setSelectedProduct("");
              setQuantity("");
              setPurchaseDate(new Date().toISOString().substr(0, 10));
              setMessage({ type: "success", text: "Compra adicionada com sucesso!" });
              setTimeout(() => {
                setMessage(null); // Limpar a mensagem após 3 segundos
              }, 3000);
            })
            .catch((error) => {
              console.error("Erro ao atualizar totalDebt do cliente:", error);
              setMessage({ type: "error", text: "Erro ao atualizar totalDebt do cliente." });
              setTimeout(() => {
                setMessage(null); // Limpar a mensagem após 3 segundos
              }, 3000);
            });
        })
        .catch((error) => {
          console.error("Erro ao adicionar compra:", error.response.data);
          setMessage({ type: "error", text: "Erro ao adicionar compra." });
          setTimeout(() => {
            setMessage(null); // Limpar a mensagem após 3 segundos
          }, 3000);
        })
        .finally(() => {
          setLoadingAddPurchase(false); // Desativa o estado de carregamento
        });
    }
  };

  const handlePaidAmount = () => {
    if (paidAmount) {
      setLoadingPaidAmount(true); // Ativa o estado de carregamento
      const amount = parseFloat(paidAmount);
      axios
        .post("https://api-start-pira.vercel.app/api/payments", { amount, date: new Date().toISOString().substr(0, 10), clientId: client.id })
        .then((response) => {
          const updatedTotalDebt = client.totalDebt - amount;
          axios
            .put(`https://api-start-pira.vercel.app/api/clients/${client.id}`, { totalDebt: updatedTotalDebt })
            .then(() => {
              fetchClientDetails(); // Recarregar os detalhes do cliente após registrar o pagamento
              setPaidAmount("");
              setMessage({ type: "success", text: "Pagamento registrado com sucesso!" });
              setTimeout(() => {
                setMessage(null); // Limpar a mensagem após 3 segundos
              }, 3000);
            })
            .catch((error) => {
              console.error("Erro ao atualizar totalDebt do cliente:", error);
              setMessage({ type: "error", text: "Erro ao atualizar totalDebt do cliente." });
              setTimeout(() => {
                setMessage(null); // Limpar a mensagem após 3 segundos
              }, 3000);
            });
        })
        .catch((error) => {
          console.error("Erro ao registrar pagamento:", error);
          setMessage({ type: "error", text: "Erro ao registrar pagamento." });
          setTimeout(() => {
            setMessage(null); // Limpar a mensagem após 3 segundos
          }, 3000);
        })
        .finally(() => {
          setLoadingPaidAmount(false); // Desativa o estado de carregamento
        });
    }
  };

  const handleDeletePurchase = (purchaseId) => {
    const purchase = client.purchases.find((p) => p.id === purchaseId);
    if (purchase) {
      const updatedTotalDebt = client.totalDebt - purchase.total;
      axios
        .delete(`https://api-start-pira.vercel.app/api/purchases/${purchaseId}`)
        .then(() => {
          axios
            .put(`https://api-start-pira.vercel.app/api/clients/${client.id}`, { totalDebt: updatedTotalDebt })
            .then(() => {
              fetchClientDetails(); // Recarregar os detalhes do cliente após excluir a compra
            })
            .catch((error) => {
              console.error("Erro ao atualizar totalDebt do cliente:", error);
              setMessage({ type: "error", text: "Compra excluída, mas houve erro ao atualizar o saldo do cliente." });
              setTimeout(() => setMessage(null), 3000);
            });
        })
        .catch((error) => {
          console.error("Erro ao excluir compra:", error);
          setMessage({ type: "error", text: error.response?.data?.error || "Erro ao excluir compra!" });
          setTimeout(() => setMessage(null), 3000);
        });
    }
  };

  const handleDeletePayment = (paymentId) => {
    const payment = client.payments.find((p) => p.id === paymentId);
    if (payment) {
      const updatedTotalDebt = client.totalDebt + payment.amount;
      axios
        .delete(`https://api-start-pira.vercel.app/api/payments/${paymentId}`)
        .then(() => {
          axios
            .put(`https://api-start-pira.vercel.app/api/clients/${client.id}`, { totalDebt: updatedTotalDebt })
            .then(() => {
              fetchClientDetails(); // Recarregar os detalhes do cliente após excluir o pagamento
            })
            .catch((error) => {
              console.error("Erro ao atualizar totalDebt do cliente:", error);
              setMessage({ type: "error", text: "Pagamento excluído, mas houve erro ao atualizar o saldo do cliente." });
              setTimeout(() => setMessage(null), 3000);
            });
        })
        .catch((error) => {
          console.error("Erro ao excluir pagamento:", error);
          setMessage({ type: "error", text: error.response?.data?.error || "Erro ao excluir pagamento!" });
          setTimeout(() => setMessage(null), 3000);
        });
    }
  };

  const handleUpdatePurchase = (purchase) => {
    setEditingPurchase(purchase.id);
    setEditingPurchaseData({
      product: purchase.product,
      quantity: purchase.quantity,
      total: purchase.total,
      date: purchase.date,
    });
  };

  const handleUpdatePayment = (payment) => {
    setEditingPayment(payment.id);
    setEditingPaymentData({
      amount: payment.amount,
      date: payment.date,
    });
  };

  const handleSavePurchase = () => {
    if (editingPurchase) {
      const { product, quantity, total, date } = editingPurchaseData;
      axios
        .put(`https://api-start-pira.vercel.app/api/purchases/${editingPurchase}`, { product, quantity, total, date, clientId: client.id })
        .then(() => {
          fetchClientDetails(); // Recarregar os detalhes do cliente após atualizar a compra
          setEditingPurchase(null);
          setEditingPurchaseData({});
        })
        .catch((error) => {
          console.error("Erro ao atualizar compra:", error.response?.data || error.message);
          setMessage({ type: "error", text: error.response?.data?.error || "Erro ao atualizar compra!" });
          setTimeout(() => setMessage(null), 3000);
        });
    }
  };

  const handleSavePayment = () => {
    if (editingPayment) {
      const { amount, date } = editingPaymentData;
      const amountfloat = parseFloat(amount);
      const datestr = new Date(date).toISOString().substr(0, 10);
      axios
        .put(`https://api-start-pira.vercel.app/api/payments/${editingPayment}`, { amount: amountfloat, date: datestr, clientId: client.id })
        .then(() => {
          fetchClientDetails(); // Recarregar os detalhes do cliente após atualizar o pagamento
          setEditingPayment(null);
          setEditingPaymentData({});
        })
        .catch((error) => {
          console.error("Erro ao atualizar pagamento:", error.response?.data || error.message);
          setMessage({ type: "error", text: error.response?.data?.error || "Erro ao atualizar pagamento!" });
          setTimeout(() => setMessage(null), 3000);
        });
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  if (!client) {
    return <div className="client-details-container">Cliente não encontrado</div>;
  }

  return (
    <div className="client-details-container">
      <h2>Detalhes do Cliente: {client.name}</h2>

      <div
        className="input-group-client"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            handleAddPurchase(); // Aciona a função ao pressionar Enter
          }
        }}
      >
        <select value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)}>
          <option value="">Selecione um produto</option>
          {products.map((product) => (
            <option key={product.id} value={product.name}>
              {product.name}
            </option>
          ))}
        </select>
        <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="Quantidade" />
        <input className="date-style" type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
        <button onClick={handleAddPurchase} disabled={loadingAddPurchase}>
          {loadingAddPurchase ? <FaSpinner className="loading-iconnn" /> : "Adicionar Compra"}
        </button>
      </div>

      <div className="input-group-client">
        <input
          type="number"
          value={paidAmount}
          onChange={(e) => setPaidAmount(e.target.value)}
          placeholder="Valor Pago"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handlePaidAmount(); // Chama a função ao pressionar Enter
            }
          }}
        />{" "}
        <button onClick={handlePaidAmount} disabled={loadingPaidAmount}>
          {loadingPaidAmount ? <FaSpinner className="loading-iconnn" /> : "Registrar Pagamento"}
        </button>{" "}
      </div>

      {/* Seção de Compras */}
      <div>
        <h3 className="section-title">Compras</h3>
        <ul className="purchase-list">
          {client.purchases && client.purchases.length > 0 ? (
            client.purchases.map((purchase) => (
              <li key={purchase.id} className="purchase-item">
                {editingPurchase === purchase.id ? (
                  <>
                    <input type="text" value={editingPurchaseData.product} onChange={(e) => setEditingPurchaseData({ ...editingPurchaseData, product: e.target.value })} />
                    <input type="number" value={editingPurchaseData.quantity} onChange={(e) => setEditingPurchaseData({ ...editingPurchaseData, quantity: e.target.value })} />
                    <input type="number" value={editingPurchaseData.total} onChange={(e) => setEditingPurchaseData({ ...editingPurchaseData, total: e.target.value })} />
                    <input type="date" value={editingPurchaseData.date} onChange={(e) => setEditingPurchaseData({ ...editingPurchaseData, date: e.target.value })} />
                    <button className="save-button" onClick={handleSavePurchase}>
                      Salvar
                    </button>
                  </>
                ) : (
                  <>
                    <span className="purchase-product">{purchase.product}</span> <span className="purchase-quantity">{purchase.quantity}</span> -
                    <span className="purchase-total payment-amount">{formatCurrency(purchase.total)}</span> <span className="purchase-date">{purchase.date}</span>
                    {/* <button className="update-button" onClick={() => handleUpdatePurchase(purchase)}>
                      Atualizar
                    </button> */}
                    <button className="delete-button" onClick={() => handleDeletePurchase(purchase.id)}>
                      Excluir
                    </button>
                  </>
                )}
              </li>
            ))
          ) : (
            <li className="no-purchases">Nenhuma compra registrada.</li>
          )}
        </ul>
      </div>

      {/* Seção de Pagamentos */}
      <div>
        <h3 className="section-title">Pagamentos</h3>
        <ul className="payment-list">
          {client.payments && client.payments.length > 0 ? (
            client.payments.map((payment) => (
              <li key={payment.id} className="payment-item">
                {editingPayment === payment.id ? (
                  <>
                    <input type="number" value={editingPaymentData.amount} onChange={(e) => setEditingPaymentData({ ...editingPaymentData, amount: e.target.value })} />
                    <input type="date" value={editingPaymentData.date} onChange={(e) => setEditingPaymentData({ ...editingPaymentData, date: e.target.value })} />
                    <button className="save-button" onClick={handleSavePayment}>
                      Salvar
                    </button>
                  </>
                ) : (
                  <>
                    <span className="payment-amount">{formatCurrency(payment.amount)}</span> - <span className="payment-date">{payment.date}</span>
                    {/* <button className="update-button" onClick={() => handleUpdatePayment(payment)}>
                      Atualizar
                    </button> */}
                    <button className="delete-button" onClick={() => handleDeletePayment(payment.id)}>
                      Excluir
                    </button>
                  </>
                )}
              </li>
            ))
          ) : (
            <li className="no-payments">Nenhum pagamento registrado.</li>
          )}
        </ul>
      </div>

      <h3 className="section-title">Valor Devedor: {formatCurrency(client.totalDebt)}</h3>
      {message && <Message message={message.text} type={message.type} onClose={() => setMessage(null)} />}
    </div>
  );
};

export default ClientDetails;
