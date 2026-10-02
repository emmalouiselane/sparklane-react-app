import { Tab, Tabs } from 'react-bootstrap';
import './PMOSReferenceGuide.css';

const mealIdeas = [
    {
        title: 'Breakfast options', id: 'pmos-breakfast',
        meals: [
            ['Yoghurt bowl', 'Greek yoghurt, Skyr or fortified soya yoghurt with berries or apple, oats and nuts or seeds.'],
            ['Eggs or tofu on toast', 'Wholegrain toast with scrambled eggs or tofu, tomatoes and spinach.'],
            ['Overnight oats', 'Oats soaked in milk or fortified soya milk, with yoghurt, chia seeds and fruit.'],
            ['Quick smoothie', 'Blend milk or fortified soya milk, yoghurt, berries, oats and nut butter.'],
        ],
    },
    {
        title: 'Lunch and dinner options', id: 'pmos-main-meals',
        meals: [
            ['Grain bowl', 'Brown rice, quinoa or couscous with chicken, tofu or chickpeas, vegetables and an olive oil dressing.'],
            ['Jacket potato', 'A potato with its skin on, topped with beans, tuna or cottage cheese, plus salad.'],
            ['Easy tray bake', 'Salmon, chicken or tofu with potatoes and frozen or fresh vegetables.'],
            ['Lentil curry or chilli', 'Lentils or beans, tomatoes and vegetables with rice; cook extra for another meal.'],
        ],
    },
    {
        title: 'Snacks, if you want them', id: 'pmos-snacks',
        meals: [
            ['Fruit and nuts', 'An apple, pear or berries with nuts or some nut butter.'],
            ['Something savoury', 'Hummus with vegetables and wholegrain crackers, or toast with cottage cheese.'],
            ['An easy fridge option', 'Yoghurt or a boiled egg with whatever fruit or vegetables you have handy.'],
        ],
    },
];

function PMOSReferenceGuide() {
    return (
        <section id="pmos-reference-guide" className="pmos-guide" aria-labelledby="pmos-guide-title">
            <header>
                <h3 id="pmos-guide-title">PMOS Reference Guide</h3>
                <p>
                    <strong>PMOS stands for Polyendocrine Metabolic Ovarian Syndrome.</strong>
                    {' '}It is the new name for the condition previously called polycystic ovary syndrome (PCOS).
                </p>
                <p className="pmos-guide-note">
                    Practical ideas for meals and everyday habits. <i>I am not a doctor or nutritionist; the below has been a result of my research.</i>
                </p>
            </header>

            <Tabs
                defaultActiveKey="food"
                id="pmos-guide-tabs"
                aria-label="PMOS guide sections"
                className="pmos-guide-tabs"
                transition={false}
            >
                <Tab eventKey="food" title="Food foundations">
                    <section id="pmos-food" aria-labelledby="pmos-food-title">
                        <h4 id="pmos-food-title">Food foundations</h4>
                        <p>
                            No single diet has been shown to work best for PMOS. Choose sustainable,
                            flexible habits; health benefits are possible without weight loss.
                        </p>
                        <ul>
                            <li><strong>Include protein:</strong> beans, lentils, tofu, eggs, fish, meat or yoghurt.</li>
                            <li><strong>Choose higher-fibre carbohydrates:</strong> oats, wholegrain bread, brown rice or potatoes with their skins on.</li>
                            <li><strong>Add variety:</strong> fruit and vegetables count whether fresh, frozen or tinned.</li>
                            <li><strong>Include unsaturated fats:</strong> olive or rapeseed oil, nuts and seeds in modest amounts.</li>
                            <li><strong>Keep drinks simple:</strong> water is a useful default; have sugary drinks less often.</li>
                        </ul>
                        <p>Every meal does not need to be perfect, balance across a day or week is the goal. Carbohydrates can be part of a balanced diet.</p>
                        <p className="pmos-guide-note">
                            Planning idea: pick a protein, a carbohydrate and some fruit or vegetables.
                            Adjust amounts to your appetite. These meal suggestions are starting points,
                            not a prescribed PMOS diet.
                        </p>
                    </section>

                </Tab>

                <Tab eventKey="meals" title="Meal ideas">
                    <section aria-labelledby="pmos-planning-title">
                        <h4 id="pmos-planning-title">Make the week easier</h4>
                        <ul>
                            <li>Choose two breakfasts and a few main meals you enjoy repeating.</li>
                            <li>Keep easy ingredients ready: frozen vegetables, tinned beans, oats, eggs or tofu.</li>
                            <li>Plan a backup meal for busy days, such as beans on toast or a microwave grain bowl.</li>
                            <li>If useful, jot down meal ideas and how they fit your routine; skip tracking that makes eating stressful.</li>
                        </ul>
                    </section>

                    <div className="pmos-guide-meals">
                        {mealIdeas.map(({ title, id, meals }) => (
                            <section key={id} id={id} aria-labelledby={`${id}-title`} className="pmos-guide-card">
                                <h4 id={`${id}-title`}>{title}</h4>
                                <ul>
                                    {meals.map(([name, description]) => (
                                        <li key={name}><strong>{name}:</strong> {description}</li>
                                    ))}
                                </ul>
                            </section>
                        ))}
                    </div>
                </Tab>

                <Tab eventKey="habits" title="Everyday habits">
                    <section id="pmos-habits" aria-labelledby="pmos-habits-title">
                        <h4 id="pmos-habits-title">Everyday habits</h4>
                        <p>Start with small, manageable changes that fit your routine and build on them over time.</p>
                        <ul>
                            <li><strong>Movement:</strong> choose activities you enjoy, such as walking, dancing, cycling or swimming. Start at a comfortable pace and make movement a regular part of your day.</li>
                            <li><strong>Sleep:</strong> aim for consistent bedtimes and wake-up times, and give yourself time to wind down before bed. Keep your sleeping space quiet, dark and comfortable.</li>
                            <li><strong>Wellbeing:</strong> make time for breaks, hobbies and people you enjoy spending time with. Try gentle breathing or a few quiet minutes when you feel stressed.</li>
                        </ul>
                    </section>
                </Tab>
            </Tabs>
        </section>
    );
}

export default PMOSReferenceGuide;
