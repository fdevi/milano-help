import { Link } from "react-router-dom";

const Register = () => {
  return (
    <div style={{ 
      padding: '100px 20px', 
      maxWidth: '400px', 
      margin: '0 auto',
      textAlign: 'center',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ color: '#10b981', marginBottom: '20px' }}>Registrati</h1>
      <p style={{ marginBottom: '30px', color: '#666' }}>
        Pagina di registrazione - versione di test
      </p>
      <p style={{ marginBottom: '20px' }}>
        Questa pagina funziona! Il problema era nel componente complesso.
      </p>
      <Link 
        to="/" 
        style={{
          display: 'inline-block',
          padding: '10px 20px',
          backgroundColor: '#10b981',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '5px'
        }}
      >
        Torna alla home
      </Link>
    </div>
  );
};

export default Register;