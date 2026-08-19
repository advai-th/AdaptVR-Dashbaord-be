-- =============================================================================
-- AdaptVR Database Sample Seed Data
-- =============================================================================

-- 1. Insert TEACHER (Password: password123)
INSERT INTO TEACHER (teacher_id, full_name, email, password_hash)
VALUES 
(
    'd8e6a2b8-936e-41bc-b5e1-88f5c9e2b10a',
    'Dr. Evelyn Vance',
    'evelyn.vance@adaptvr.edu',
    '$2b$10$zlcGgSxq6078N/j1WaXn/eFOTgDN6vHP0.8BDJGkR8GJyEZ45ZHJm'
),
(
    'f1e2d3c4-b5a6-4987-8765-43210fedcba9',
    'Prof. Marcus Brody',
    'marcus.brody@adaptvr.edu',
    '$2b$10$zlcGgSxq6078N/j1WaXn/eFOTgDN6vHP0.8BDJGkR8GJyEZ45ZHJm'
)
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;

-- 2. Insert STUDENTS
INSERT INTO STUDENT (student_id, teacher_id, full_name, age, grade)
VALUES
(
    'a1b2c3d4-e5f6-4a8b-9c0d-e1f2a3b4c5d6',
    'd8e6a2b8-936e-41bc-b5e1-88f5c9e2b10a',
    'Alex Smith',
    15,
    'Grade 10'
),
(
    'b2c3d4e5-f6a7-4b9c-8d1e-2f3a4b5c6d7e',
    'd8e6a2b8-936e-41bc-b5e1-88f5c9e2b10a',
    'Emily Johnson',
    16,
    'Grade 11'
),
(
    'c3d4e5f6-a7b8-4c0d-8e2f-3a4b5c6d7e8f',
    'd8e6a2b8-936e-41bc-b5e1-88f5c9e2b10a',
    'Michael Brown',
    14,
    'Grade 9'
)
ON CONFLICT (student_id) DO NOTHING;

-- 3. Insert LEARNING_MODULES
INSERT INTO LEARNING_MODULE (module_id, module_name, category, description, difficulty_level, status)
VALUES
(
    '33a7e53f-4279-455b-b9d9-bf7b1b3690d1',
    'Mechanical Gear Assembly & Inspection',
    'Mechanical Engineering',
    'Interactive 3D assembly of planetary gear systems with real-time adaptive guidance.',
    'intermediate',
    'active'
),
(
    '44b8f64f-538a-466c-aad0-cf8c2c47a1d2',
    'Tyre Balancing & Calibration',
    'Automotive Technology',
    'Calibrate industrial wheel balancers and apply counterweights to stabilize rotational vibration.',
    'intermediate',
    'active'
),
(
    '55c9a75f-649b-477d-aae1-df9d3d58b2e3',
    'Circuit Diagram Troubleshooting',
    'Electronics',
    'Assemble electrical resistors and capacitors to match target values under time constraints.',
    'advanced',
    'active'
),
(
    '66da186f-75ac-488e-acf2-ef0e4e69c3f4',
    'Workshop Safety & Tool Protocols',
    'Occupational Safety',
    'Hazard identification and selection of appropriate personal protective equipment.',
    'beginner',
    'active'
)
ON CONFLICT (module_name) DO NOTHING;

-- 4. Insert TEACHER_MODULE assignments
INSERT INTO TEACHER_MODULE (teacher_module_id, teacher_id, module_id)
VALUES
(
    '88888888-1111-2222-3333-444444444441',
    'd8e6a2b8-936e-41bc-b5e1-88f5c9e2b10a',
    '33a7e53f-4279-455b-b9d9-bf7b1b3690d1'
),
(
    '88888888-1111-2222-3333-444444444442',
    'd8e6a2b8-936e-41bc-b5e1-88f5c9e2b10a',
    '44b8f64f-538a-466c-aad0-cf8c2c47a1d2'
),
(
    '88888888-1111-2222-3333-444444444443',
    'd8e6a2b8-936e-41bc-b5e1-88f5c9e2b10a',
    '55c9a75f-649b-477d-aae1-df9d3d58b2e3'
)
ON CONFLICT (teacher_id, module_id) DO NOTHING;

-- 5. Insert SESSIONS
INSERT INTO SESSION (session_id, teacher_id, student_id, module_id, start_time, end_time, final_score, completion_status)
VALUES
(
    '11111111-2222-3333-4444-555555555555',
    'd8e6a2b8-936e-41bc-b5e1-88f5c9e2b10a', -- Dr. Evelyn Vance
    'a1b2c3d4-e5f6-4a8b-9c0d-e1f2a3b4c5d6', -- Alex Smith
    '33a7e53f-4279-455b-b9d9-bf7b1b3690d1', -- Mechanical Gear Assembly
    CURRENT_TIMESTAMP - INTERVAL '15 minutes',
    NULL,
    88.50,
    'in_progress'
),
(
    '22222222-3333-4444-5555-666666666666',
    'd8e6a2b8-936e-41bc-b5e1-88f5c9e2b10a',
    'b2c3d4e5-f6a7-4b9c-8d1e-2f3a4b5c6d7e', -- Emily Johnson
    '55c9a75f-649b-477d-aae1-df9d3d58b2e3', -- Circuit Diagram
    CURRENT_TIMESTAMP - INTERVAL '45 minutes',
    CURRENT_TIMESTAMP - INTERVAL '15 minutes',
    94.00,
    'completed'
)
ON CONFLICT (session_id) DO NOTHING;

-- 6. Insert INTERACTION_EVENTS
INSERT INTO INTERACTION_EVENT (event_id, session_id, event_time, event_type, object_name, response_time, error_count, interaction_value)
VALUES
(
    '99999999-1111-0000-0000-000000000001',
    '11111111-2222-3333-4444-555555555555',
    CURRENT_TIMESTAMP - INTERVAL '14 minutes',
    'task_started',
    'Gear_Shaft_A',
    1.250,
    0,
    '{"step": 1, "instruction": "Align spur gear with keyway"}'::jsonb
),
(
    '99999999-1111-0000-0000-000000000002',
    '11111111-2222-3333-4444-555555555555',
    CURRENT_TIMESTAMP - INTERVAL '10 minutes',
    'incorrect_snap_attempt',
    'Spur_Gear_24T',
    3.820,
    2,
    '{"attempted_slot": "Shaft_B", "correct_slot": "Shaft_A"}'::jsonb
),
(
    '99999999-1111-0000-0000-000000000003',
    '11111111-2222-3333-4444-555555555555',
    CURRENT_TIMESTAMP - INTERVAL '5 minutes',
    'hint_requested',
    'Hint_Button_UI',
    0.500,
    2,
    '{"hint_type": "visual_overlay"}'::jsonb
)
ON CONFLICT (event_id) DO NOTHING;

-- 7. Insert ML_PREDICTIONS
INSERT INTO ML_PREDICTION (prediction_id, session_id, predicted_cognitive_load, confidence_score, predicted_at)
VALUES
(
    '77777777-1111-2222-3333-444444444441',
    '11111111-2222-3333-4444-555555555555',
    'medium',
    0.8250,
    CURRENT_TIMESTAMP - INTERVAL '12 minutes'
),
(
    '77777777-1111-2222-3333-444444444442',
    '11111111-2222-3333-4444-555555555555',
    'high',
    0.9120,
    CURRENT_TIMESTAMP - INTERVAL '6 minutes'
)
ON CONFLICT (prediction_id) DO NOTHING;

-- 8. Insert ADAPTATION_EVENTS
INSERT INTO ADAPTATION_EVENT (adaptation_id, session_id, prediction_id, adaptation_type, previous_difficulty, new_difficulty, description, adapted_at)
VALUES
(
    '66666666-1111-2222-3333-444444444441',
    '11111111-2222-3333-4444-555555555555',
    '77777777-1111-2222-3333-444444444442',
    'provide_visual_guidance',
    'intermediate',
    'intermediate',
    'Activated 3D holographic alignment arrow following high cognitive load prediction and 2 consecutive snap errors.',
    CURRENT_TIMESTAMP - INTERVAL '5 minutes'
)
ON CONFLICT (adaptation_id) DO NOTHING;
