-- ============================================================
-- YSKAIPE Core 4 — "Polabaris" Founding Workers
-- Cornelius / Lake Norman, ZIP 28031
-- ============================================================

INSERT INTO workers (
  first_name, last_name, email, phone,
  zip_code, service_radius_miles,
  age_tier, worker_type,
  skills, status, notes
) VALUES

(
  'Deb', 'Conenna', 'littlepolarbears@gmail.com', '7045550001',
  '28031', 15, 'adult', 'solo',
  ARRAY[
    'land_lawn_mow','land_mulch','land_sod','land_tree_trim','land_stump_grind','land_hardscape','land_retaining_wall',
    'clean_power_wash','clean_window_ext','clean_deep_house','clean_airbnb_turnover','clean_post_construction',
    'life_event_setup','life_holiday_lights','life_pool_clean',
    'move_load_unload','move_junk_removal','move_storage_unit',
    'gc_furniture_assembly','gc_tv_mount','life_handyman_misc'
  ],
  'qualified',
  'YSKAIPE co-founder · landscaping, cleaning, home prep specialist'
),

(
  'Nick', 'Conenna', 'nick@peakingwaters.com', '7045550002',
  '28031', 15, 'adult', 'solo',
  ARRAY[
    'land_lawn_mow','land_mulch','land_sod','land_tree_trim','land_stump_grind','land_hardscape',
    'clean_power_wash','clean_window_ext','clean_dryer_vent','clean_carpet',
    'gc_furniture_assembly','gc_tv_mount','gc_drywall_patch','gc_trim_install','gc_door_install',
    'gc_deck_repair','gc_tile_backsplash','gc_flooring_install',
    'move_full_local','move_load_unload','move_junk_removal','move_appliance',
    'auto_wash_basic','auto_detail_full','auto_battery','auto_tire_rotation',
    'paint_single_room','paint_deck_stain',
    'life_handyman_misc','life_event_setup','life_holiday_lights'
  ],
  'qualified',
  'YSKAIPE co-founder · general handyman, landscaping, moving, light automotive'
),

(
  'Julianna', 'Conenna', 'julesconenna@gmail.com', '7045550003',
  '28031', 10, 'junior', 'junior',
  ARRAY[
    'land_lawn_mow','land_mulch',
    'clean_power_wash','clean_window_ext','clean_deep_house','clean_airbnb_turnover',
    'life_event_setup','life_holiday_lights','life_pet_sit','life_errands',
    'move_load_unload','move_storage_unit',
    'gc_furniture_assembly','auto_wash_basic','auto_battery'
  ],
  'qualified',
  'Youth worker · lawn care, cleaning, event setup, pet care'
),

(
  'Daniel', 'Conenna', 'dconenna2010@gmail.com', '7045550004',
  '28031', 10, 'junior', 'junior',
  ARRAY[
    'land_lawn_mow','land_mulch',
    'clean_power_wash','clean_window_ext','clean_airbnb_turnover','clean_deep_house',
    'life_event_setup','life_holiday_lights','life_pet_sit','life_errands',
    'move_load_unload','move_storage_unit',
    'gc_furniture_assembly','auto_wash_basic'
  ],
  'qualified',
  'Youth worker · lawn care, cleaning, general help'
)

ON CONFLICT (email) DO UPDATE SET
  first_name           = EXCLUDED.first_name,
  last_name            = EXCLUDED.last_name,
  phone                = EXCLUDED.phone,
  zip_code             = EXCLUDED.zip_code,
  service_radius_miles = EXCLUDED.service_radius_miles,
  age_tier             = EXCLUDED.age_tier,
  worker_type          = EXCLUDED.worker_type,
  skills               = EXCLUDED.skills,
  status               = EXCLUDED.status,
  notes                = EXCLUDED.notes;

-- Verify
SELECT first_name, last_name, email, age_tier, worker_type, status,
       array_length(skills, 1) AS skill_count
FROM workers
WHERE email IN (
  'littlepolarbears@gmail.com',
  'nick@peakingwaters.com',
  'julesconenna@gmail.com',
  'dconenna2010@gmail.com'
)
ORDER BY age_tier DESC, first_name;
