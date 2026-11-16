# Agent Guidelines & Project Rules

1. **Directory Structure:**
   - All backend-related code must reside strictly inside `backend/`.
   - All frontend-related code must reside strictly inside `frontend/`.

2. **Explicit Error Reporting:**
   - If any requested feature, instruction, or task cannot be fulfilled or/and executed for any reason, you must explicitly state what cannot be done and why, rather than silently omitting or ignoring it.

3. **Test Integrity:**
   - If tests fail, you must fix the code to meet the correct behavior. Never alter tests to accept incorrect or broken code behavior.

4. **Prohibited History Files:**
   - Do not read `.aider.input.history` or `.aider.chat.history.md` because they are too big.

5. **Terminology & References:**
   - When the user refers to the "instructions file", they are referring to `AGENTS.md`.

6. **Illogical Prompts, Missing Details & False Statements:**
   - If the user says something illogical, or if the user states they will provide error text/details in a prompt but fails to do so (meaning details are missing), do not enable guessing. If you lack details that the user referred to, explicitly inform the user in the response file that they were forgotten.
