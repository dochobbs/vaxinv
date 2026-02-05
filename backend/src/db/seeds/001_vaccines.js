exports.seed = async function (knex) {
  await knex('vaccines').del();

  const vaccines = [
    { name: 'Diphtheria, Tetanus, Pertussis (DTaP)', short_name: 'DTaP', cvx_code: '20', cpt_code: '90700', manufacturer: 'Sanofi Pasteur', doses_per_vial: 1, ndc_pattern: '^49281\\d{4}', min_age_months: 2, max_age_months: 83 },
    { name: 'Inactivated Poliovirus (IPV)', short_name: 'IPV', cvx_code: '10', cpt_code: '90713', manufacturer: 'Sanofi Pasteur', doses_per_vial: 1, ndc_pattern: '^49281\\d{4}', min_age_months: 2, max_age_months: 216 },
    { name: 'Measles, Mumps, Rubella (MMR)', short_name: 'MMR', cvx_code: '03', cpt_code: '90707', manufacturer: 'Merck', doses_per_vial: 10, beyond_use_days: 0, ndc_pattern: '^00006\\d{4}', min_age_months: 12, max_age_months: 216 },
    { name: 'Varicella (VAR)', short_name: 'Varicella', cvx_code: '21', cpt_code: '90716', manufacturer: 'Merck', doses_per_vial: 1, ndc_pattern: '^00006\\d{4}', min_age_months: 12, max_age_months: 216 },
    { name: 'Hepatitis B (HepB)', short_name: 'HepB', cvx_code: '08', cpt_code: '90744', manufacturer: 'Merck', doses_per_vial: 1, ndc_pattern: '^00006\\d{4}', min_age_months: 0, max_age_months: 228 },
    { name: 'Hepatitis A (HepA)', short_name: 'HepA', cvx_code: '83', cpt_code: '90633', manufacturer: 'Merck', doses_per_vial: 1, ndc_pattern: '^00006\\d{4}', min_age_months: 12, max_age_months: 216 },
    { name: 'Haemophilus influenzae type b (Hib)', short_name: 'Hib', cvx_code: '17', cpt_code: '90648', manufacturer: 'Sanofi Pasteur', doses_per_vial: 1, ndc_pattern: '^49281\\d{4}', min_age_months: 2, max_age_months: 59 },
    { name: 'Pneumococcal Conjugate (PCV15)', short_name: 'PCV15', cvx_code: '215', cpt_code: '90677', manufacturer: 'Merck', doses_per_vial: 1, ndc_pattern: '^00006\\d{4}', min_age_months: 2, max_age_months: 71 },
    { name: 'Pneumococcal Conjugate (PCV20)', short_name: 'PCV20', cvx_code: '216', cpt_code: '90678', manufacturer: 'Pfizer', doses_per_vial: 1, ndc_pattern: '^00005\\d{4}', min_age_months: 2, max_age_months: 71 },
    { name: 'Rotavirus (RV5)', short_name: 'Rotavirus', cvx_code: '116', cpt_code: '90680', manufacturer: 'Merck', doses_per_vial: 1, ndc_pattern: '^00006\\d{4}', min_age_months: 2, max_age_months: 8 },
    { name: 'Influenza (IIV4) Pediatric', short_name: 'Flu (Peds)', cvx_code: '141', cpt_code: '90686', manufacturer: 'Sanofi Pasteur', doses_per_vial: 10, beyond_use_days: 28, ndc_pattern: '^49281\\d{4}', min_age_months: 6, max_age_months: 35 },
    { name: 'Influenza (IIV4) Standard', short_name: 'Flu (Std)', cvx_code: '150', cpt_code: '90688', manufacturer: 'Sanofi Pasteur', doses_per_vial: 10, beyond_use_days: 28, ndc_pattern: '^49281\\d{4}', min_age_months: 36, max_age_months: 216 },
    { name: 'Meningococcal ACWY (MenACWY)', short_name: 'MenACWY', cvx_code: '114', cpt_code: '90734', manufacturer: 'Sanofi Pasteur', doses_per_vial: 1, ndc_pattern: '^49281\\d{4}', min_age_months: 132, max_age_months: 264 },
    { name: 'Meningococcal B (MenB)', short_name: 'MenB', cvx_code: '162', cpt_code: '90620', manufacturer: 'Pfizer', doses_per_vial: 1, ndc_pattern: '^00005\\d{4}', min_age_months: 120, max_age_months: 264 },
    { name: 'Human Papillomavirus (HPV)', short_name: 'HPV', cvx_code: '165', cpt_code: '90651', manufacturer: 'Merck', doses_per_vial: 1, ndc_pattern: '^00006\\d{4}', min_age_months: 108, max_age_months: 540 },
    { name: 'Tetanus, Diphtheria, Pertussis (Tdap)', short_name: 'Tdap', cvx_code: '115', cpt_code: '90715', manufacturer: 'Sanofi Pasteur', doses_per_vial: 1, ndc_pattern: '^49281\\d{4}', min_age_months: 84, max_age_months: 780 },
    { name: 'DTaP-IPV-HepB (Pediarix)', short_name: 'Pediarix', cvx_code: '110', cpt_code: '90723', manufacturer: 'GSK', doses_per_vial: 1, ndc_pattern: '^58160\\d{4}', min_age_months: 2, max_age_months: 83 },
    { name: 'DTaP-IPV (Kinrix)', short_name: 'Kinrix', cvx_code: '130', cpt_code: '90696', manufacturer: 'GSK', doses_per_vial: 1, ndc_pattern: '^58160\\d{4}', min_age_months: 48, max_age_months: 83 },
    { name: 'MMR-Varicella (ProQuad)', short_name: 'MMRV', cvx_code: '94', cpt_code: '90710', manufacturer: 'Merck', doses_per_vial: 1, ndc_pattern: '^00006\\d{4}', min_age_months: 12, max_age_months: 144 },
    { name: 'COVID-19 mRNA (Pfizer, Peds)', short_name: 'COVID (Peds)', cvx_code: '218', cpt_code: '91309', manufacturer: 'Pfizer', doses_per_vial: 1, ndc_pattern: '^59267\\d{4}', min_age_months: 6, max_age_months: 59 },
  ];

  await knex('vaccines').insert(vaccines.map(v => ({ ...v, is_active: true })));
};
