const mongoose = require('mongoose');
require('dotenv').config();

const Venue = require('./src/models/Turf');

const turfs = [
  {
    name: 'Kasa Kai Turf Arena (Andheri)',
    shortName: 'Kasa Kai Andheri',
    address: {
      line1: '123 Link Road',
      area: 'Andheri West',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400053',
    },
    surfaceType: 'artificial_turf',
    numberOfPitches: 2,
    pitchSizes: ['medium', 'small'],
    hasFloodlights: true,
    isVerified: true,
  },
  {
    name: 'FC Mumbai Sports Complex',
    shortName: 'FC Mumbai',
    address: {
      line1: '45 Bandra Kurla Complex',
      area: 'Bandra',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400051',
    },
    surfaceType: 'artificial_turf',
    numberOfPitches: 3,
    pitchSizes: ['large', 'medium'],
    hasParking: true,
    isVerified: true,
  },
  {
    name: 'Green Field Juhu',
    shortName: 'Green Juhu',
    address: {
      line1: '99 Juhu Tara Road',
      area: 'Juhu',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400049',
    },
    surfaceType: 'natural_grass',
    numberOfPitches: 1,
    pitchSizes: ['full'],
    isVerified: true,
  },
  {
    name: 'Kickoff Turf Malad',
    shortName: 'Kickoff Malad',
    address: {
      line1: '78 SV Road',
      area: 'Malad West',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400064',
    },
    surfaceType: 'artificial_turf',
    numberOfPitches: 4,
    pitchSizes: ['small', 'medium'],
    hasChangingRooms: true,
    isVerified: true,
  },
  {
    name: 'Powai Play Arena',
    shortName: 'Powai Arena',
    address: {
      line1: '34 Hiranandani',
      area: 'Powai',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400076',
    },
    surfaceType: 'concrete',
    numberOfPitches: 2,
    pitchSizes: ['large'],
    hasRefreshments: true,
    isVerified: true,
  },
];

mongoose
  .connect(process.env.MONGO_URI, {})
  .then(async () => {
    try {
      console.log('Clearing old temp turfs...');
      await Venue.deleteMany({ isVerified: true });

      console.log('Seeding 5 dummy turfs for testing...');
      await Venue.insertMany(turfs);

      console.log('✅ Turfs successfully added to database!');
    } catch (err) {
      console.error('Seed Error:', err);
    } finally {
      process.exit(0);
    }
  })
  .catch(console.error);


