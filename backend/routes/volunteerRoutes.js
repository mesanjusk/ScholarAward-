const router = require('express').Router();
const { protect } = require('../middleware/auth');
const {
  getPublicTeams,
  getVolunteers,
  createVolunteer,
  updateVolunteer,
  createPublicVolunteer,
  resendVolunteerOtp
} = require('../controllers/volunteerController');

router.get('/public-teams', getPublicTeams);
router.post('/public-register', createPublicVolunteer);
router.post('/resend-otp', resendVolunteerOtp);

router.get('/', protect, getVolunteers);
router.post('/', protect, createVolunteer);
router.put('/:id', protect, updateVolunteer);

module.exports = router;
