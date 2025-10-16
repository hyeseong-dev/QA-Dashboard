# Five-Layer Architecture Quick Reference

**Source**: CONTEXT_ENGINEERING vault by A.B. Vijay Kumar, building on Rasmus Widing's work  
**Success Rate**: 30% → 90%+ with systematic application

## 🏗️ Layer Structure

```
┌─────────────────────────────────────────┐
│  Layer 5: Response Context              │  ← Output Format
├─────────────────────────────────────────┤
│  Layer 4: Interaction Context           │  ← Examples
├─────────────────────────────────────────┤
│  Layer 3: Task Context                  │  ← Constraints  
├─────────────────────────────────────────┤
│  Layer 2: Domain Context                │  ← Knowledge Base
├─────────────────────────────────────────┤
│  Layer 1: System Context                │  ← Role Definition
└─────────────────────────────────────────┘
```

## 📋 Quick Template

```xml
<system_context>
[Layer 1: Who is the AI? Core capabilities, constraints, safety rules]
</system_context>

<domain_context>
[Layer 2: What does the AI know? Specialized knowledge, terminology, standards]
</domain_context>

<task_context>
[Layer 3: What should the AI do? Specific goals, success criteria, requirements]
</task_context>

<interaction_context>
[Layer 4: How should the AI communicate? Style, feedback, error handling]
</interaction_context>

<response_context>
[Layer 5: How should the AI deliver? Format, structure, quality standards]
</response_context>

<user_input>
[Actual user query or request]
</user_input>
```

## 🎯 Layer Purposes

| Layer | Purpose | Frequency | Example Focus |
|-------|---------|-----------|---------------|
| **1. System** | Foundation personality | Rarely changes | "You are a QA expert..." |
| **2. Domain** | Specialized knowledge | Occasional updates | QA terminology, standards |
| **3. Task** | Specific objectives | Often changes | "Review this test case..." |
| **4. Interaction** | Communication style | Occasional updates | Professional, clear feedback |
| **5. Response** | Output format | Often changes | "Provide JSON format..." |

## ⚡ Quick Implementation

### For Simple Tasks:
```xml
<system_context>You are a QA Dashboard developer expert.</system_context>
<task_context>Fix the database schema issue with error_type column.</task_context>
<response_context>Provide SQL migration and explanation.</response_context>
<user_input>[user query]</user_input>
```

### For Complex Tasks:
Use full five-layer structure from `CONSTITUTION.md`

## 🚫 Common Pitfalls

❌ **Mixing layers** - Domain knowledge in task requirements  
❌ **Overloading layers** - Too much in one layer  
❌ **Ignoring Layer 1** - Generic AI without constraints  
❌ **Vague Layer 3** - Unclear success criteria  
❌ **Implicit Layer 5** - Assuming model knows format  

✅ **Keep layers distinct and focused**  
✅ **Be explicit at each layer**  
✅ **Test layers independently**  
✅ **Update based on failures**

## 📊 Benefits

- **30-40% cost reduction** through intelligent routing
- **60-80% reduction in hallucinations** with proper context
- **2-3x performance improvement** through systematic testing
- **40-50% error reduction** with explicit error handling

## 🎪 For QA Dashboard Project

**Always use the project-specific constitution in `CONSTITUTION.md`** which includes:

- ✅ QA domain expertise pre-loaded
- ✅ Next.js + PostgreSQL technical context
- ✅ Project-specific safety constraints
- ✅ Team communication standards
- ✅ Code quality requirements

---

**Remember**: This isn't just "better prompting" - it's systematic context architecture that transforms AI from unpredictable tool to reliable partner.