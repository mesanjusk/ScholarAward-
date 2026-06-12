const router = require('express').Router();
const { protect } = require('../middleware/auth');
const AgendaCategory = require('../models/AgendaCategory');

// GET all categories sorted by order
router.get('/', protect, async (req, res) => {
  try {
    const cats = await AgendaCategory.find().sort({ order: 1, createdAt: 1 }).lean();
    res.json(cats);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// POST create category
router.post('/', protect, async (req, res) => {
  try {
    const cat = await AgendaCategory.create(req.body);
    res.status(201).json(cat);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// POST seed default agenda (idempotent — only inserts if collection is empty)
router.post('/seed', protect, async (req, res) => {
  try {
    const existing = await AgendaCategory.countDocuments();
    if (existing > 0) return res.json({ message: 'Already seeded', count: existing });

    const data = require('../data/agendaSeed.json');
    await AgendaCategory.insertMany(data);
    res.status(201).json({ message: 'Seeded', count: data.length });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// PATCH update category (title, order, students, presenters)
router.patch('/:id', protect, async (req, res) => {
  try {
    const cat = await AgendaCategory.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!cat) return res.status(404).json({ message: 'Not found' });
    res.json(cat);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// DELETE category
router.delete('/:id', protect, async (req, res) => {
  try {
    await AgendaCategory.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
