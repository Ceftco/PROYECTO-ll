const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'FIRMA_SECRETA';

app.use(cors({ origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware para autenticar token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'Se requiere autorización' });

  const tokenParts = authHeader.split(' ');
  const token = tokenParts.length === 2 ? tokenParts[1] : authHeader; // Acepta  Bearer ... o token directo

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token inválido o expirado' });
    req.user = user;
    next();
  });
};

const db = new sqlite3.Database('./mi_proyecto.db', (err) => {
  if (err) {
    console.error('No se pudo conectar a la DB:', err.message);
    process.exit(1);
  }
  console.log('Conectado exitosamente a mi_proyecto.db');

  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT UNIQUE,
      password TEXT
    )`, (err) => {
      if (err) console.error('Error al crear tabla usuarios:', err.message);
      else console.log("Tabla 'usuarios' verificada/creada con éxito");
    });

    db.run(`CREATE TABLE IF NOT EXISTS notas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo TEXT,
      contenido TEXT,
      user_id INTEGER,
      FOREIGN KEY (user_id) REFERENCES usuarios(id)
    )`, (err) => {
      if (err) console.error('Error al crear tabla notas:', err.message);
      else console.log("Tabla 'notas' verificada/creada con éxito");
    });
  });
});

// Registro
app.post('/auth/register', async (req, res) => {
  const { nombre, password } = req.body;
  if (!nombre || !password) return res.status(400).json({ error: 'Nombre y contraseña son obligatorios' });

  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const sql = 'INSERT INTO usuarios (nombre, password) VALUES (?, ?)';

    db.run(sql, [nombre, hashedPassword], function (err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(409).json({ error: 'Usuario ya existe' });
        }
        console.error('Error registro:', err);
        return res.status(500).json({ error: 'Error interno al registrar usuario' });
      }
      return res.status(201).json({ mensaje: 'Usuario registrado con éxito', id: this.lastID });
    });
  } catch (error) {
    console.error('Error procesando registro:', error);
    res.status(500).json({ error: 'Error procesando registro' });
  }
});

// Login
app.post('/auth/login', async (req, res) => {
  const { nombre, password } = req.body;
  if (!nombre || !password) return res.status(400).json({ error: 'Nombre y contraseña son obligatorios' });

  db.get('SELECT * FROM usuarios WHERE nombre = ?', [nombre], async (err, user) => {
    if (err) {
      console.error('Login error DB:', err);
      return res.status(500).json({ error: 'Error interno' });
    }
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const validPass = await bcrypt.compare(password, user.password);
    if (!validPass) return res.status(401).json({ error: 'Clave incorrecta' });

    const token = jwt.sign({ id: user.id, nombre: user.nombre }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ mensaje: 'Login exitoso', token });
  });
});

// Notas
app.get('/notas', authenticateToken, (req, res) => {
  db.all('SELECT id, titulo, contenido FROM notas WHERE user_id = ?', [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/notas', authenticateToken, (req, res) => {
  const { titulo, contenido } = req.body;
  if (!titulo || !contenido) return res.status(400).json({ error: 'Título y contenido son obligatorios' });

  db.run('INSERT INTO notas (titulo, contenido, user_id) VALUES (?, ?, ?)', [titulo, contenido, req.user.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ mensaje: 'Nota creada', id: this.lastID });
  });
});

app.put('/notas/:id', authenticateToken, (req, res) => {
  const { titulo, contenido } = req.body;
  const { id } = req.params;
  if (!titulo || !contenido) return res.status(400).json({ error: 'Título y contenido son obligatorios' });

  db.run('UPDATE notas SET titulo = ?, contenido = ? WHERE id = ? AND user_id = ?', [titulo, contenido, id, req.user.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Nota no encontrada' });
    res.json({ mensaje: 'Nota actualizada' });
  });
});

app.delete('/notas/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM notas WHERE id = ? AND user_id = ?', [id, req.user.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Nota no encontrada' });
    res.json({ mensaje: 'Nota eliminada' });
  });
});

app.listen(PORT, () => console.log(`Servidor Seguro en puerto ${PORT}`));
