import rules from './model.publicodes';

console.log(`Valeur de a : ${rules['a'].evaluate().value} ${rules['a'].unit}`);
console.log(`Valeur de b : ${rules['b'].evaluate().value} ${rules['b'].unit}`);
console.log(
  `Valeur de part : ${rules['part'].evaluate().value} ${rules['part'].unit}`,
);
