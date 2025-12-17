const {createClient} = require('@supabase/supabase-js')

const supabase = createClient(
    process.env.SUPABASE_URL,
    // process.env.SUPABASE_KEY,
    process.env.SERVICE_ROLE_KEY
)

module.exports = supabase



