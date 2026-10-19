using UnityEngine;

namespace Game.Meta
{
    public enum Position { GK, CB, LB, RB, CM, CDM, CAM, LW, RW, ST }
    public enum Rarity { Common, Rare, Epic, Legendary }

    [CreateAssetMenu(menuName = "Game/Player Definition")]
    public class PlayerDefinition : ScriptableObject
    {
        public string id;
        public string displayName;
        public Position position;
        public Rarity rarity;
        public int baseOverall;
        public Stats baseStats;
        public GameObject modelPrefab; // keyinchalik AssetReference (Addressables)

        [System.Serializable]
        public struct Stats { public int pace, shooting, passing, dribbling, defending, physical; }
    }
}
