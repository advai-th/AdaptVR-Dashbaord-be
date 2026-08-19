-- =============================================================================
-- AdaptVR PostgreSQL Database Schema
-- AI-Driven Adaptive VR Learning System
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Function to handle automated updated_at timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- =============================================================================
-- 1. TEACHER TABLE
-- Stores trainer/instructor authentication & profile data
-- =============================================================================
CREATE TABLE IF NOT EXISTS TEACHER (
    teacher_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_teacher_email ON TEACHER(email);

CREATE TRIGGER update_teacher_updated_at
BEFORE UPDATE ON TEACHER
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 2. STUDENT TABLE
-- Stores learner profiles managed by instructors
-- =============================================================================
CREATE TABLE IF NOT EXISTS STUDENT (
    student_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID NOT NULL REFERENCES TEACHER(teacher_id) ON DELETE RESTRICT,
    full_name VARCHAR(100) NOT NULL,
    age INTEGER CHECK (age > 0 AND age < 120),
    grade VARCHAR(30),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_student_teacher_id ON STUDENT(teacher_id);
CREATE INDEX IF NOT EXISTS idx_student_full_name ON STUDENT(full_name);

CREATE TRIGGER update_student_updated_at
BEFORE UPDATE ON STUDENT
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 3. LEARNING_MODULE TABLE
-- Catalog of available adaptive VR learning modules
-- =============================================================================
CREATE TABLE IF NOT EXISTS LEARNING_MODULE (
    module_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_name VARCHAR(150) UNIQUE NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    difficulty_level VARCHAR(30) NOT NULL CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced', 'adaptive')),
    status VARCHAR(30) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_learning_module_category ON LEARNING_MODULE(category);
CREATE INDEX IF NOT EXISTS idx_learning_module_status ON LEARNING_MODULE(status);

CREATE TRIGGER update_learning_module_updated_at
BEFORE UPDATE ON LEARNING_MODULE
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 4. TEACHER_MODULE TABLE
-- Junction table for modules assigned to/managed by specific teachers
-- =============================================================================
CREATE TABLE IF NOT EXISTS TEACHER_MODULE (
    teacher_module_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID NOT NULL REFERENCES TEACHER(teacher_id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES LEARNING_MODULE(module_id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_teacher_module UNIQUE (teacher_id, module_id)
);

CREATE INDEX IF NOT EXISTS idx_teacher_module_teacher_id ON TEACHER_MODULE(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_module_module_id ON TEACHER_MODULE(module_id);

-- =============================================================================
-- 5. SESSION TABLE
-- Core execution unit: one learning session attempted by a student on a module
-- =============================================================================
CREATE TABLE IF NOT EXISTS SESSION (
    session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID NOT NULL REFERENCES TEACHER(teacher_id) ON DELETE RESTRICT,
    student_id UUID NOT NULL REFERENCES STUDENT(student_id) ON DELETE RESTRICT,
    module_id UUID NOT NULL REFERENCES LEARNING_MODULE(module_id) ON DELETE RESTRICT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP WITH TIME ZONE,
    final_score DECIMAL(5,2) CHECK (final_score >= 0.00 AND final_score <= 100.00),
    completion_status VARCHAR(30) NOT NULL DEFAULT 'in_progress' 
        CHECK (completion_status IN ('in_progress', 'completed', 'paused', 'aborted')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_session_end_time CHECK (end_time IS NULL OR end_time >= start_time)
);

CREATE INDEX IF NOT EXISTS idx_session_teacher_id ON SESSION(teacher_id);
CREATE INDEX IF NOT EXISTS idx_session_student_id ON SESSION(student_id);
CREATE INDEX IF NOT EXISTS idx_session_module_id ON SESSION(module_id);
CREATE INDEX IF NOT EXISTS idx_session_completion_status ON SESSION(completion_status);
CREATE INDEX IF NOT EXISTS idx_session_start_time ON SESSION(start_time);

CREATE TRIGGER update_session_updated_at
BEFORE UPDATE ON SESSION
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 6. INTERACTION_EVENT TABLE
-- High-frequency telemetry events captured from the Unity VR client
-- =============================================================================
CREATE TABLE IF NOT EXISTS INTERACTION_EVENT (
    event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES SESSION(session_id) ON DELETE CASCADE,
    event_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    event_type VARCHAR(50) NOT NULL,
    object_name VARCHAR(100),
    response_time DECIMAL(10,3) CHECK (response_time >= 0.000), -- in seconds
    error_count INTEGER DEFAULT 0 CHECK (error_count >= 0),
    interaction_value JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_interaction_event_session_id ON INTERACTION_EVENT(session_id);
CREATE INDEX IF NOT EXISTS idx_interaction_event_event_time ON INTERACTION_EVENT(event_time);
CREATE INDEX IF NOT EXISTS idx_interaction_event_event_type ON INTERACTION_EVENT(event_type);

-- =============================================================================
-- 7. ML_PREDICTION TABLE
-- Real-time estimated cognitive load & learner state generated by XGBoost ML
-- =============================================================================
CREATE TABLE IF NOT EXISTS ML_PREDICTION (
    prediction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES SESSION(session_id) ON DELETE CASCADE,
    predicted_cognitive_load VARCHAR(20) NOT NULL CHECK (predicted_cognitive_load IN ('low', 'medium', 'high')),
    confidence_score DECIMAL(5,4) NOT NULL CHECK (confidence_score >= 0.0000 AND confidence_score <= 1.0000),
    predicted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ml_prediction_session_id ON ML_PREDICTION(session_id);
CREATE INDEX IF NOT EXISTS idx_ml_prediction_predicted_at ON ML_PREDICTION(predicted_at);

-- =============================================================================
-- 8. ADAPTATION_EVENT TABLE
-- Adjustments triggered dynamically by the adaptive engine during VR sessions
-- =============================================================================
CREATE TABLE IF NOT EXISTS ADAPTATION_EVENT (
    adaptation_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES SESSION(session_id) ON DELETE CASCADE,
    prediction_id UUID REFERENCES ML_PREDICTION(prediction_id) ON DELETE SET NULL,
    adaptation_type VARCHAR(50) NOT NULL,
    previous_difficulty VARCHAR(30),
    new_difficulty VARCHAR(30),
    description TEXT,
    adapted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_adaptation_event_session_id ON ADAPTATION_EVENT(session_id);
CREATE INDEX IF NOT EXISTS idx_adaptation_event_prediction_id ON ADAPTATION_EVENT(prediction_id);
CREATE INDEX IF NOT EXISTS idx_adaptation_event_adapted_at ON ADAPTATION_EVENT(adapted_at);
