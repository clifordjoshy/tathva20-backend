'use strict';

const { sanitizeEntity } = require('strapi-utils');

module.exports = {
	async create(ctx) {

		const { user, event: lecture, refCode } = ctx.request.body;

		if (user.id !== ctx.state.user.id)
			return ctx.unauthorized("Unauthorized user access");

		const hasUserRegistered = ctx.state.user['registeredLectures'].find(o => o.lecture === lecture.id)
		if (typeof hasUserRegistered !== 'undefined')
			return ctx.badRequest("Already registered for lecture");

		let lectureObj = await strapi.services.lecture.findOne({ id: lecture.id });

		if (lectureObj === null)
			return ctx.badRequest('Lecture does not exist');

		if(lectureObj.regPrice !== 0)
			return ctx.badRequest('This is a paid lecture');

		let currentDate = new Date();
		if (!(new Date(lectureObj.regStartDate) < currentDate && currentDate < new Date(lectureObj.regEndDate)))
			return ctx.badRequest('Not in registration period');

		const updateData = {
			user,
			lecture,
            lectureRefCode : refCode
		};

		await strapi.query("lecture").model.query((qb) => {
            qb.where("id", lectureObj.id);
            qb.increment("currentRegCount", 1);
		}).fetch();

		let entity = await strapi.services['user-lecture-detail'].create(updateData);
		entity.metaValues = null;
		return sanitizeEntity(entity, { model: strapi.models['user-lecture-detail'] });
	},

	async findOne(ctx) {
		const paramId = Number.parseInt(ctx.params.id, 10);

		if (typeof (ctx.state.user['registeredLectures'].find(o => o.id === paramId)) === 'undefined')
			return ctx.unauthorized("Unauthorized user access");

		const detail = await strapi.services['user-lecture-detail'].findOne({ id: paramId });
		const lecture = await strapi.services.lecture.findOne({ id: detail.lecture.id });

		if (new Date() < new Date(lecture.regEndDate))
			detail.metaValues = null;
        
		if(Array.isArray(lecture.commonMetaValues))
			detail.metaValues = lecture.commonMetaValues.concat((Array.isArray(detail.metaValues))?detail.metaValues:[]);
		
		return sanitizeEntity(detail, { model: strapi.models['user-lecture-detail'] });
	},
};
