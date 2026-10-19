using System;
using System.Collections.Generic;

namespace Game.Core
{
    public static class EventBus
    {
        private static readonly Dictionary<Type, Delegate> Handlers = new();

        public static void Subscribe<T>(Action<T> h) =>
            Handlers[typeof(T)] = Handlers.TryGetValue(typeof(T), out var d) ? Delegate.Combine(d, h) : h;

        public static void Unsubscribe<T>(Action<T> h)
        {
            if (Handlers.TryGetValue(typeof(T), out var d)) Handlers[typeof(T)] = Delegate.Remove(d, h);
        }

        public static void Publish<T>(T evt)
        {
            if (Handlers.TryGetValue(typeof(T), out var d)) ((Action<T>)d)?.Invoke(evt);
        }
    }

    public readonly struct GoalScored { public readonly int Team; public GoalScored(int t) { Team = t; } }
    public readonly struct CurrencyChanged { public readonly long Coins, Gems; public CurrencyChanged(long c, long g) { Coins = c; Gems = g; } }
}
