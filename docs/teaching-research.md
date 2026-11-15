# Teaching research for the study redesign (2026-11-15)

Why this file: the app still doesn't *teach*. The user's goal: open a practice test, have each problem explained by **concept, plan and mechanism**, **watch the picture and the worked example being built**, then **do a matching problem alone**. The screen has too many buttons, and a finished guided example is confusing. This file collects what physics-education and learning research says, and what it means for the design. Sources at the end. No student or course is named here.

## 1. What the research says

**Experts start from the principle; novices start from the surface.** Asked to sort problems, experts group them by the law that solves them (energy, momentum, Newton's 2nd law); novices group them by what they look like (a ramp, a spring) [Chi, Feltovich & Glaser 1981]. Teaching that makes students *name the principle, justify it, and write a plan before any equation* ("Conceptual Problem Solving") gave better solutions and higher conceptual and problem-solving scores than ordinary problem practice in high-school classes [Docktor, Strand, Mestre & Ross 2015; earlier Dufresne et al. 1992].
→ "Concept, plan, mechanism" is exactly this. The concept step must come first and be the student's choice, not a label the app shows.

**A fixed set of processes is what gets graded.** The Minnesota rubric scores five things: a useful description, the physics approach, its specific application, the math, and a logical progression [Docktor & Heller, MAPS]. The Minnesota strategy (focus → describe the physics → plan → execute → evaluate) is the student-facing version [Heller, Keith & Anderson 1992].
→ These five are the right headings for every worked example, and the right labels for feedback.

**Drawings: drawing well predicts success, but forcing a drawing has a cost.** Students who draw *correct* free-body diagrams are much more likely to get the answer, and strong students use the diagram to solve and to check, weak ones as decoration [Rosengrant, Van Heuvelen & Etkina 2009]. But prompting everyone to draw a force diagram pushes them into formal procedures and away from quicker conceptual routes, which are sometimes more often right [Heckler 2010; Kuo, Hallinen & Conlin replication: the shift to formal procedures replicated, the drop in accuracy did not]. Studies of *representational choice* treat picking the right representation as a skill in itself [Kohl & Finkelstein; De Cock 2012]. Each law has its own picture: motion diagram for kinematics, force diagram for Newton's laws, **energy bar chart** for energy, before-and-after sketch for momentum [Etkina, Van Heuvelen & Rosengrant; Van Heuvelen & Zou 2001]. Modeling Instruction puts a step before that: the **system schema**, deciding what is in the system and what interacts with it [Hinrichs; Turner 2003].
→ **The user is right.** "Drawing first" as a global switch is the wrong design. Choosing *whether* to draw, and *which* picture fits the law, is part of the skill, and it should be a decision inside each problem: "What picture helps here? None / sketch / force diagram / energy bar chart / before–after." The app checks the choice against the law the student picked and says why.

**Worked examples first, then fade them.** For novices, studying worked examples beats solving problems [worked-example effect, Sweller]. Removing steps one at a time ("fading", usually from the end backwards) beats plain example–problem pairs, because the gaps make students explain the steps to themselves [Renkl & Atkinson 2003; Atkinson, Renkl & Merrill 2003]. As students improve, full examples start to *hurt* (expertise reversal) [Kalyuga], so fading should follow the student's success, not a fixed schedule [Salden et al. 2010].
→ Practice test A = watch, fully worked. Test B = the same problems faded: first a few steps blank, then the plan only, then nothing. The app removes support when the student gets a step right, and brings it back after a slip.

**Label each step with its purpose.** Worked examples whose steps carry a short goal label ("find the speed at the bottom") transfer better to new problems [Catrambone; Margulieux & Catrambone].
→ Every line of the worked solution gets a goal label from the plan, not just the algebra reason.

**Watching someone solve it works, if the viewer has to answer.** Video modeling examples (watching a solver work) teach as well as written worked examples [Hoogerheide & van Gog]. Physics videos teach most when they **stop and ask questions** along the way and show the picture well [Kestin & Miller 2022]. Learner-paced segments beat one continuous playthrough [Mayer: segmenting].
→ The "watch" mode builds the drawing and the solution step by step, **pausing to ask** ("Which law? Which way does friction point? What is K at the top?") before showing each decision.

**Clutter costs learning.** Extra elements that aren't needed for the goal lower learning (coherence); highlighting only the current step helps (signaling); text placed apart from the picture it explains forces split attention [Mayer; Sweller].
→ One thing on screen at a time: the problem, the picture, the current step. Tools appear only inside the step that needs them. The 60-odd controls on the first screen today (header toggles, stage tabs, unit tabs, 25 drawing tools, presets, guide levels) work against every one of these principles.

**Mix the problems up before an exam.** Interleaving problem types forces students to *choose* the method, which blocked practice lets them skip; evidence is strong in math and only suggested for physics [Rohrer et al.].
→ After a practice test, a mixed review set whose first question is always "which law?".

**Model the thinking, then coach, then fade** [Collins, Brown & Newman: cognitive apprenticeship]. Modeling should show how a *student* could reasonably solve it, not an expert's shortcut [Instructional Strategies that Foster Effective Problem-Solving, 2023].

**Videos I could not watch.** I can't view YouTube videos. What I could check: popular physics channels split into short topic videos with notes and real footage (Flipping Physics) or a plain whiteboard solved live (van Biezen); research on why video helps is above. Flipped-class reports say the gain comes from the discussion and examples around the videos, not the videos alone.

## 2. What this means for the app

1. **One study flow per problem, in five steps, each one screen:**
   1. *Read*: the problem, with givens and the question marked (the student taps them).
   2. *Concept*: which law, and why it holds here (the app's LAW_WHY reasons and decoys already exist).
   3. *Picture*: does a picture help, and which one? The app draws it, or the student does.
   4. *Plan*: the equations in symbols, in order, each with its goal.
   5. *Mechanism*: the algebra, symbols first, then numbers, then units and a sanity check.
2. **Three modes over the same flow:** *Watch* (the app does each step, pausing to ask first), *Faded* (some steps are the student's), *Alone* (only checking). A practice-test pair maps onto it: test A in Watch, test B in Faded or Alone.
3. **Remove the Drawing-first / Guided toggle.** The picture is a step in every problem.
4. **The workspace becomes the "workbench"**, one button away, for free problems. The study flow shows only Back / Next and the current step's own controls.
5. **Finishing a worked example ends cleanly**: a one-screen summary (law, picture, plan, answer), then "Try the matching problem".

## 3. Open questions for the design session

- Which practice tests first (a test A and its test B pair)?
- Watch mode pace: one click per step (research favours learner pace), or play with pauses?
- Keep the current workspace as the workbench, or rebuild it smaller?
- Publishing the exam problems: personal details can come out, but the problem text may belong to the instructor or publisher. Safer: original twins with new numbers in the public app; originals in `private/`.

## Sources
- Chi, Feltovich & Glaser (1981), Cognitive Science 5, 121: https://apps.dtic.mil/sti/pdfs/ADA100301.pdf
- Docktor, Strand, Mestre & Ross (2015), PRST-PER 11, 020106: https://link.aps.org/doi/10.1103/PhysRevSTPER.11.020106
- Dufresne et al. and the UMass concept-based problem solving work: https://www.srri.umass.edu/sites/srri/files/gerace-1997cbp/index.pdf
- Docktor & Heller, MAPS rubric: https://www.physport.org/assessments/assessment.cfm?A=MAPS
- Rosengrant, Van Heuvelen & Etkina (2009), PRST-PER 5, 010108: https://www.compadre.org/introphys/items/detail.cfm?ID=13230
- Heckler (2010) and replications: https://arxiv.org/pdf/1810.10071 , https://www.per-central.org/items/perc/5520.pdf
- Drawing a diagram in electrostatics: https://arxiv.org/pdf/1601.05467
- De Cock (2012), representational choice: https://www.compadre.org/portal/items/detail.cfm?ID=12638 ; Kohl & Finkelstein: https://spot.colorado.edu/~finkelsn/reps_abs.htm
- Van Heuvelen & Zou (2001), energy bar charts: https://moodle2.units.it/pluginfile.php/418643/mod_resource/content/1/multiple%20representation%20of%20work-energy%20process.pdf
- Etkina et al., multiple representations: https://secure-media.collegeboard.org/apc/Physics_Multiple_Representations_of_Knowledge_SF.pdf
- System schemas (Hinrichs): https://arxiv.org/abs/physics/0608092
- Renkl & Atkinson, fading: https://link.springer.com/doi/10.1007/s11251-009-9107-8 , https://en.wikipedia.com/wiki/Worked-example_effect
- Expertise reversal: https://en.wikipedia.org/wiki/Expertise_reversal_effect , https://my.chartered.college/?p=5912
- Subgoal labels: https://core.ac.uk/download/71428245.pdf
- Video modeling examples (Hoogerheide & van Gog): https://repub.eur.nl/pub/81397 , https://www.frontiersin.org/articles/10.3389/feduc.2019.00104/pdf
- Kestin & Miller (2022), PRPER 18, 010148: https://link.aps.org/doi/10.1103/PhysRevPhysEducRes.18.010148
- Mayer's principles: https://wikis.utexas.edu/x/YLzcB , https://pmc.ncbi.nlm.nih.gov/articles/PMC7940870
- Interleaving (Rohrer): https://link.springer.com/article/10.3758/s13423-014-0588-3 , https://zenodo.org/record/4676278/files/HartwigRohrerB.pdf?download=1
- Cognitive apprenticeship in physics: https://arxiv.org/pdf/2304.05585
- Flipping Physics: https://www.flippingphysics.com/faq.html ; flipped-class note: https://homepage.physics.uiowa.edu/~jgoree/teaching/flip/JG-Flipped-Classroom-post.pdf
