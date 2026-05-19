const express = require('express');
const cors    = require('cors');
const fs      = require('fs');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ── File paths ────────────────────────────────────────────────────────
const UPS_FILE   = path.join(__dirname, 'data', 'ups.json');
const DIAG_FILE  = path.join(__dirname, 'data', 'diagnostics.json');

// ── Generic file helpers ──────────────────────────────────────────────
function readFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return [];
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.error('readFile error:', err.message);
    return [];
  }
}

function writeFile(filePath, data) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (err) {
    console.error('writeFile error:', err.message);
    return false;
  }
}

function notFound(res, msg) {
  return res.status(404).json({ success: false, message: msg });
}
function serverError(res, msg) {
  return res.status(500).json({ success: false, message: msg });
}

// ════════════════════════════════════════════════════════════════════
// RESOURCE 1: /api/ups  — Облік пристроїв ДБЖ
// ════════════════════════════════════════════════════════════════════

// GET /api/ups — список усіх пристроїв
// Query params: ?status=active|inactive  ?location=text
app.get('/api/ups', (req, res) => {
  let data = readFile(UPS_FILE);

  if (req.query.status) {
    data = data.filter(d => d.status === req.query.status);
  }
  if (req.query.location) {
    const loc = req.query.location.toLowerCase();
    data = data.filter(d => d.location.toLowerCase().includes(loc));
  }

  res.json({
    success: true,
    count:   data.length,
    data
  });
});

// GET /api/ups/stats — статистика пристроїв
app.get('/api/ups/stats', (req, res) => {
  const data = readFile(UPS_FILE);
  const stats = {
    total:       data.length,
    active:      data.filter(d => d.status === 'active').length,
    inactive:    data.filter(d => d.status === 'inactive').length,
    maintenance: data.filter(d => d.status === 'maintenance').length,
    totalPowerKva: data.reduce((s, d) => s + (parseFloat(d.powerKva) || 0), 0).toFixed(1),
  };
  res.json({ success: true, data: stats });
});

// GET /api/ups/:id — один пристрій
app.get('/api/ups/:id', (req, res) => {
  const data   = readFile(UPS_FILE);
  const record = data.find(d => d.id === req.params.id);
  if (!record) return notFound(res, 'Пристрій не знайдено');
  res.json({ success: true, data: record });
});

// POST /api/ups — додати пристрій
app.post('/api/ups', (req, res) => {
  const { model, serialNumber, powerKva, location,
          batteryCapacityAh, installDate, status } = req.body;

  if (!model || !serialNumber || !powerKva || !location) {
    return res.status(400).json({
      success: false,
      message: 'Обов\'язкові поля: model, serialNumber, powerKva, location'
    });
  }

  const record = {
    id:                 Date.now().toString(),
    model:              model.trim(),
    serialNumber:       serialNumber.trim(),
    powerKva:           parseFloat(powerKva),
    location:           location.trim(),
    batteryCapacityAh:  batteryCapacityAh ? parseFloat(batteryCapacityAh) : null,
    installDate:        installDate || null,
    status:             status || 'active',
    createdAt:          new Date().toISOString(),
    updatedAt:          new Date().toISOString(),
  };

  const data = readFile(UPS_FILE);
  data.push(record);

  if (!writeFile(UPS_FILE, data)) return serverError(res, 'Помилка збереження');
  res.status(201).json({
    success: true,
    message: 'Пристрій ДБЖ успішно додано',
    data:    record
  });
});

// PUT /api/ups/:id — оновити пристрій
app.put('/api/ups/:id', (req, res) => {
  const data  = readFile(UPS_FILE);
  const index = data.findIndex(d => d.id === req.params.id);
  if (index === -1) return notFound(res, 'Пристрій не знайдено');

  data[index] = {
    ...data[index],
    ...req.body,
    id:        data[index].id,
    createdAt: data[index].createdAt,
    updatedAt: new Date().toISOString(),
  };

  if (!writeFile(UPS_FILE, data)) return serverError(res, 'Помилка збереження');
  res.json({
    success: true,
    message: 'Пристрій оновлено',
    data:    data[index]
  });
});

// DELETE /api/ups/:id — видалити пристрій
app.delete('/api/ups/:id', (req, res) => {
  const data    = readFile(UPS_FILE);
  const updated = data.filter(d => d.id !== req.params.id);
  if (data.length === updated.length) return notFound(res, 'Пристрій не знайдено');
  if (!writeFile(UPS_FILE, updated)) return serverError(res, 'Помилка збереження');
  res.json({ success: true, message: 'Пристрій видалено' });
});

// ════════════════════════════════════════════════════════════════════
// RESOURCE 2: /api/diagnostics  — Журнал діагностики
// ════════════════════════════════════════════════════════════════════

// GET /api/diagnostics — всі записи
// Query params: ?result=ok|warning|critical  ?upsId=id
app.get('/api/diagnostics', (req, res) => {
  let data = readFile(DIAG_FILE);

  if (req.query.result) {
    data = data.filter(d => d.result === req.query.result);
  }
  if (req.query.upsId) {
    data = data.filter(d => d.upsId === req.query.upsId);
  }

  res.json({ success: true, count: data.length, data });
});

// GET /api/diagnostics/stats — статистика діагностики
app.get('/api/diagnostics/stats', (req, res) => {
  const data = readFile(DIAG_FILE);
  res.json({
    success: true,
    data: {
      total:    data.length,
      ok:       data.filter(d => d.result === 'ok').length,
      warning:  data.filter(d => d.result === 'warning').length,
      critical: data.filter(d => d.result === 'critical').length,
    }
  });
});

// GET /api/diagnostics/:id — один запис
app.get('/api/diagnostics/:id', (req, res) => {
  const data   = readFile(DIAG_FILE);
  const record = data.find(d => d.id === req.params.id);
  if (!record) return notFound(res, 'Запис не знайдено');
  res.json({ success: true, data: record });
});

// POST /api/diagnostics — новий запис
app.post('/api/diagnostics', (req, res) => {
  const { upsId, diagnosticDate, result, batteryHealth,
          inputVoltage, outputVoltage, loadPercent, notes } = req.body;

  if (!upsId || !diagnosticDate || !result) {
    return res.status(400).json({
      success: false,
      message: 'Обов\'язкові поля: upsId, diagnosticDate, result'
    });
  }

  const NOTIFICATIONS = {
    ok:       'НОРМА — відхилень не виявлено',
    warning:  'УВАГА — планове обслуговування',
    critical: 'КРИТИЧНО — негайне втручання',
  };

  const record = {
    id:             Date.now().toString(),
    upsId,
    diagnosticDate,
    result,
    batteryHealth:  batteryHealth  ? parseFloat(batteryHealth)  : null,
    inputVoltage:   inputVoltage   ? parseFloat(inputVoltage)   : null,
    outputVoltage:  outputVoltage  ? parseFloat(outputVoltage)  : null,
    loadPercent:    loadPercent    ? parseFloat(loadPercent)    : null,
    notes:          notes ? notes.trim() : '',
    notification:   NOTIFICATIONS[result] || '',
    createdAt:      new Date().toISOString(),
  };

  const data = readFile(DIAG_FILE);
  data.unshift(record);

  if (!writeFile(DIAG_FILE, data)) return serverError(res, 'Помилка збереження');
  res.status(201).json({
    success: true,
    message: 'Запис діагностики збережено',
    data:    record
  });
});

// PUT /api/diagnostics/:id — оновити запис
app.put('/api/diagnostics/:id', (req, res) => {
  const data  = readFile(DIAG_FILE);
  const index = data.findIndex(d => d.id === req.params.id);
  if (index === -1) return notFound(res, 'Запис не знайдено');

  data[index] = {
    ...data[index],
    ...req.body,
    id:        data[index].id,
    createdAt: data[index].createdAt,
    updatedAt: new Date().toISOString(),
  };

  if (!writeFile(DIAG_FILE, data)) return serverError(res, 'Помилка збереження');
  res.json({ success: true, message: 'Запис оновлено', data: data[index] });
});

// DELETE /api/diagnostics/:id — видалити запис
app.delete('/api/diagnostics/:id', (req, res) => {
  const data    = readFile(DIAG_FILE);
  const updated = data.filter(d => d.id !== req.params.id);
  if (data.length === updated.length) return notFound(res, 'Запис не знайдено');
  if (!writeFile(DIAG_FILE, updated)) return serverError(res, 'Помилка збереження');
  res.json({ success: true, message: 'Запис видалено' });
});

// ── 404 handler ───────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Маршрут ${req.path} не знайдено` });
});

// ── Error handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Внутрішня помилка сервера' });
});

// ── Start ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`REST API запущено: http://localhost:${PORT}`);
  console.log('Доступні маршрути:');
  console.log('  GET    /api/ups');
  console.log('  GET    /api/ups/stats');
  console.log('  GET    /api/ups/:id');
  console.log('  POST   /api/ups');
  console.log('  PUT    /api/ups/:id');
  console.log('  DELETE /api/ups/:id');
  console.log('  GET    /api/diagnostics');
  console.log('  GET    /api/diagnostics/stats');
  console.log('  GET    /api/diagnostics/:id');
  console.log('  POST   /api/diagnostics');
  console.log('  PUT    /api/diagnostics/:id');
  console.log('  DELETE /api/diagnostics/:id');
});
