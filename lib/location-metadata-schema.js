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
  pollutants: Joi.array().items(Joi.string().valid(['pm25', 'pm10', 'co', 'bc', 'so2', 'no2', 'o3']).required())
    .required()
    .description('Pollutants measured by this instrument'),
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
  altitude: Joi.number().description('The altitude of the location in meters'),
  activationDate: Joi.date().description('Date the instruments were activated at this location, stored as an ISO timestamp'),
  deactivationDate: Joi.date().description('Date the instruments were deactivated at this location, stored as an ISO timestamp'),
  active: Joi.boolean().description('Whether the location is currently active'),
  notes: Joi.string().description('Any relevant notes about the location'),
  attribution: Joi.array()
    .items(Joi.object(attributionSchema))
    .description('Data attribution in descending order of prominence'),
  instruments: Joi.array()
    .items(Joi.object(instrumentSchema))
    .description('An array of instruments installed at this location')
};

export default schema;
