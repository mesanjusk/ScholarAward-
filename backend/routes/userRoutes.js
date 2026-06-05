const express = require('express');
const {
  getUsers,
  createUser,
  updateUser,
  bulkImportGuests,
  bulkImportVolunteers,
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, getUsers);
router.post('/', protect, createUser);
router.post('/bulk-import-guests', protect, bulkImportGuests);
router.post('/bulk-import-volunteers', protect, bulkImportVolunteers);
router.put('/:id', protect, updateUser);

module.exports = router;
