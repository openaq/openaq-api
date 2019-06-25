import Joi from 'joi';

const attributionSchema = {
  name: Joi.string().description('Attribution Name'),
  url: Joi.string().description('Attribution Url')
};

const instrumentSchema = {
  type: Joi.string()
    .required()
    .description('The type of instrument'),
  serialNumber: Joi.string()
    .required()
    .description('Serial number of the instrument'),
  manufacturer: Joi.string().description('Manufacturer of the instrument'),
  modelName: Joi.string().description('Model name of the instrument'),
  parameters: Joi.array().items(Joi.string().valid(['pm25', 'pm10', 'co', 'bc', 'so2', 'no2', 'o3']).required())
    .required()
    .description('Pollutants measured by this instrument'),
  measurementStyle: Joi.string().valid('automated', 'manual', 'unknown').description('How measurements are taken'),
  rawFrequency: Joi.number()
    .integer()
    .description('The raw sampling frequency of the instrument in milliseconds'),
  reportingFrequency: Joi.number()
    .integer()
    .description('The reporting sampling frequency of the instrument in milliseconds'),
  calibrationProcedures: Joi.string().description('Instrument-specific calibration procedures'),
  inletHeight: Joi.number().description('Height of intake inlet in meters'),
  activationDate: Joi.date().description('Date the instrument was activated at this location, stored as an ISO timestamp'),
  deactivationDate: Joi.date().description('Date the instrument was deactivated at this location, stored as an ISO timestamp'),
  active: Joi.boolean().description('Whether the location is currently active'),
  notes: Joi.string().description('Any relevant notes about the instrument')
};

const schema = {
  name: Joi.string()
    .required()
    .description('Name of a location'),
  siteType: Joi.string()
    .description('The type of area the location is in'),
  sourceType: Joi.string()
    .description('The source/operator of the instruments at the location'),
  elevation: Joi.number().description('The elevation of the location in meters'),
  activationDate: Joi.date().description('Date the instruments were activated at this location, stored as an ISO timestamp'),
  deactivationDate: Joi.date().description('Date the instruments were deactivated at this location, stored as an ISO timestamp'),
  active: Joi.boolean().description('Whether the location is currently active'),
  notes: Joi.string().description('Any relevant notes about the location'),
  attribution: Joi.array()
    .items(Joi.object(attributionSchema))
    .description('Data attribution in descending order of prominence'),
  instruments: Joi.array()
    .items(Joi.object(instrumentSchema).required())
    .required()
    .description('An array of instruments installed at this location'),
  coordinates: Joi.object({
    latitude: Joi.number().required(),
    longitude: Joi.number().required()
  })
};

export default schema;

import _ from 'lodash';

export function computeCompleteness (metadata) {
  const checkProp = (prop, obj = metadata) => {
    const v = _.get(obj, prop);
    return Number(v !== undefined && v !== null);
  };

  const simpleRootChecks = [
    'name',
    'siteType',
    'sourceType',
    'elevation',
    'activationDate',
    'active',
    'coordinates.latitude',
    'coordinates.longitude'
  ];

  let requiredPropCount = simpleRootChecks.length;
  let actualPropCount = simpleRootChecks.reduce((c, prop) => c + checkProp(prop), 0);

  // If is not active we need the deativation date.
  if (metadata.active === false) {
    requiredPropCount++;
    actualPropCount += checkProp('deactivationDate');
  }

  // The attribution is required, but the amount of props depends on the amount
  // of children.
  const attr = metadata.attribution || [];
  requiredPropCount += Math.max(2, attr.length * 2);
  actualPropCount += attr.reduce((total, child) => {
    return total + [
      'name',
      'url'
    ].reduce((c, prop) => c + checkProp(prop, child), 0);
  }, 0);

  // Calc instrument props.
  const inst = metadata.instruments || [];
  const instrumentsSimpleChecks = [
    'type',
    'serialNumber',
    'manufacturer',
    'modelName',
    'measurementStyle',
    'rawFrequency',
    'reportingFrequency',
    'calibrationProcedures',
    'inletHeight',
    'activationDate',
    'active',
    // The parameters is an array and needs at least one item.
    // If it passes the check means that it is not null, and because of the
    // schema validation can be considered valid.
    'parameters'
  ];
  const instCounts = inst.reduce((totals, child) => {
    let req = instrumentsSimpleChecks.length;
    let actual = instrumentsSimpleChecks.reduce((c, prop) => c + checkProp(prop, child), 0);

    // If is not active we need the deativation date.
    if (child.active === false) {
      req++;
      actual += checkProp('deactivationDate', child);
    }

    return {
      req: totals.req + req,
      actual: totals.actual + actual
    };
  }, { req: 0, actual: 0 });

  // There is a minimum required props for the instruments, but in the end it
  // also depends on children.
  requiredPropCount += Math.max(instrumentsSimpleChecks.length, instCounts.req);
  actualPropCount += instCounts.actual;

  return actualPropCount / requiredPropCount;
}
