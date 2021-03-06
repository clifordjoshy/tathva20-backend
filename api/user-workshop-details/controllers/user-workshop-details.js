'use strict';

const { sanitizeEntity } = require('strapi-utils');

module.exports = {
	async create(ctx) {

		const { user, event: workshop, refCode } = ctx.request.body;

		if (user.id !== ctx.state.user.id)
			return ctx.unauthorized("Unauthorized user access");

		const hasUserRegistered = ctx.state.user['registeredWorkshops'].find(o => o.workshop === workshop.id)
		if (typeof hasUserRegistered !== 'undefined')
			return ctx.badRequest("Already registered for workshop");

		let workshopObj = await strapi.services.workshop.findOne({ id: workshop.id });

		if (workshopObj === null)
			return ctx.badRequest('Workshop does not exist');

		if(workshopObj.regPrice !== 0)
			return ctx.badRequest('This is a paid workshop');

		let currentDate = new Date();
		if (!(new Date(workshopObj.regStartDate) < currentDate && currentDate < new Date(workshopObj.regEndDate)))
			return ctx.badRequest('Not in registration period');

		const updateData = {
			user,
			workshop,
            workshopRefCode : refCode
		};

		await strapi.query("workshop").model.query((qb) => {
            qb.where("id", workshopObj.id);
            qb.increment("currentRegCount", 1);
		}).fetch();

		let entity = await strapi.services['user-workshop-details'].create(updateData);
		entity.metaValues = null;
		return sanitizeEntity(entity, { model: strapi.models['user-workshop-details'] });
	},

	async findOne(ctx) {
		const paramId = Number.parseInt(ctx.params.id, 10);

		if (typeof (ctx.state.user['registeredWorkshops'].find(o => o.id === paramId)) === 'undefined')
			return ctx.unauthorized("Unauthorized user access");

		const detail = await strapi.services['user-workshop-details'].findOne({ id: paramId });
		const workshop = await strapi.services.workshop.findOne({ id: detail.workshop.id });

		if (new Date() < new Date(workshop.regEndDate))
			detail.metaValues = null;
        
		if(Array.isArray(workshop.commonMetaValues))
			detail.metaValues = workshop.commonMetaValues.concat((Array.isArray(detail.metaValues))?detail.metaValues:[]);
		
		return sanitizeEntity(detail, { model: strapi.models['user-workshop-details'] });
	},
};
