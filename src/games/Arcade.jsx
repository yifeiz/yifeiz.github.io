import "../styles/Arcade.scss";

// Add games here as they're built: { title, description, href }.
const GAMES = [
  {
    title: "Snake",
    description: "Eat the stars. Don't bite your tail.",
    href: `${import.meta.env.BASE_URL}games/snake/`,
  },
];

const Arcade = () => {
  return (
    <div className="arcade">
      <h1>You found the moon.</h1>
      <p className="tagline">Welcome to the arcade.</p>

      {GAMES.length > 0 ? (
        <ul className="games">
          {GAMES.map((game) => (
            <li key={game.href}>
              <a href={game.href}>
                <span className="game-title">{game.title}</span>
                <span className="game-description">{game.description}</span>
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="empty">The first games are still being built. Check back soon.</p>
      )}

      <a className="home-link" href={import.meta.env.BASE_URL}>
        ← Back to Earth
      </a>
    </div>
  );
};

export default Arcade;
