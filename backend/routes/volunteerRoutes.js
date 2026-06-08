const router = require('express').Router();
const { protect } = require('../middleware/auth');
const {
  getPublicTeams,
  getVolunteers,

  updateVolunteer,
  createPublicVolunteer,
  resendVolunteerOtp
} = require('../controllers/volunteerController');

router.get('/public-teams', getPublicTeams);
router.get('/public-register', protect, getVolunteers);
router.post('/public-register', createPublicVolunteer);
router.post('/resend-otp', resendVolunteerOtp);

router.get('/', protect, getVolunteers);

router.put('/:id', protect, updateVolunteer);

module.exports = router;
