import Mailgun from 'mailgun.js';
import formData from 'form-data';

const mailgun = new Mailgun(formData);
const BRAND_MAIL_DOMAIN = 'notify.setler.app';
const BRAND_NAME = 'Setler';

let mg;

export const addEmailToList = async ({ email, listAddress }) => {
	mg ??= mailgun.client({
		username: 'api',
		key: process.env.MAILGUN_PRIVATE
	});

	// must have email and listAddress
	if (!email || !listAddress) {
		throw new Error('Email and listAddress are required');
	}

	const result = await mg.lists.members.createMember(listAddress, {
		address: email,
		// name: 'John Smith', // optional, modifiable on website
		// vars: {hobby: "chess"}, // optional, modifiable on website
		subscribed: 'yes', // optional, modifiable on website
		upsert: 'yes' // optional, choose yes to insert if not exist, or update it exist
	});

	return result;
};
