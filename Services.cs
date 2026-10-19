using System;
using System.Collections.Generic;

namespace Game.Core
{
    public static class Services
    {
        private static readonly Dictionary<Type, object> Map = new();
        public static void Register<T>(T service) => Map[typeof(T)] = service;
        public static T Get<T>() => (T)Map[typeof(T)];
    }
}
